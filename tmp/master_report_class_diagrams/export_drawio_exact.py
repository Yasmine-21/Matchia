from __future__ import annotations

import html
import math
import re
import sys
import textwrap
import xml.etree.ElementTree as ET
from pathlib import Path


SOURCE = Path(sys.argv[1])
OUT_DIR = Path(sys.argv[2])
OUT_DIR.mkdir(parents=True, exist_ok=True)

EXPORTS = {
    0: ("drawio_global.svg", 8000),
    1: ("drawio_saas.svg", 6000),
    2: ("drawio_catalogue.svg", 6000),
    3: ("drawio_dealer.svg", 6000),
    4: ("drawio_financement.svg", 6000),
    6: ("drawio_securite.svg", 6000),
}


def style_map(raw: str | None) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in (raw or "").split(";"):
        if "=" in item:
            key, value = item.split("=", 1)
            result[key] = value
        elif item:
            result[item] = "1"
    return result


def number(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else default
    except ValueError:
        return default


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def plain_lines(value: str) -> list[str]:
    value = re.sub(r"(?i)<br\s*/?>", "\n", value)
    value = re.sub(r"(?i)</div\s*>", "\n", value)
    value = re.sub(r"(?i)<hr\s*/?>", "\n", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value).replace("\xa0", " ")
    return [re.sub(r"\s+", " ", line).strip() for line in value.splitlines() if line.strip()]


def svg_text(x: float, y: float, text: str, size: float, color: str, anchor: str = "start",
             bold: bool = False, italic: bool = False) -> str:
    weight = "700" if bold else "400"
    font_style = "italic" if italic else "normal"
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}" '
        f'font-family="Arial, sans-serif" font-size="{size:.2f}" font-weight="{weight}" '
        f'font-style="{font_style}" fill="{esc(color)}">{esc(text)}</text>'
    )


def wrap_lines(lines: list[str], width: float, font_size: float) -> list[str]:
    max_chars = max(8, int(width / max(4.8, font_size * 0.54)))
    wrapped: list[str] = []
    for line in lines:
        wrapped.extend(textwrap.wrap(line, width=max_chars, break_long_words=False, break_on_hyphens=False) or [""])
    return wrapped


def endpoint(box: tuple[float, float, float, float], styles: dict[str, str], prefix: str,
             other: tuple[float, float, float, float]) -> tuple[float, float]:
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2
    ox, oy, ow, oh = other
    ocx, ocy = ox + ow / 2, oy + oh / 2
    sx = styles.get(prefix + "X")
    sy = styles.get(prefix + "Y")
    if sx is not None and sy is not None:
        return x + w * number(sx, 0.5), y + h * number(sy, 0.5)
    dx, dy = ocx - cx, ocy - cy
    if abs(dx) * h >= abs(dy) * w:
        return (x + w if dx >= 0 else x, cy)
    return (cx, y + h if dy >= 0 else y)


def path_length(points: list[tuple[float, float]]) -> float:
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:]))


def point_on_path(points: list[tuple[float, float]], fraction: float) -> tuple[float, float]:
    total = path_length(points)
    target = total * max(0.0, min(1.0, fraction))
    walked = 0.0
    for a, b in zip(points, points[1:]):
        seg = math.hypot(b[0] - a[0], b[1] - a[1])
        if walked + seg >= target and seg:
            t = (target - walked) / seg
            return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        walked += seg
    return points[-1]


def render_page(diagram: ET.Element, output: Path, target_width: int) -> None:
    model = diagram.find("mxGraphModel")
    if model is None:
        raise ValueError(f"Diagramme sans mxGraphModel : {diagram.get('name')}")
    cells = model.find("root").findall("mxCell")
    by_id = {cell.get("id"): cell for cell in cells}

    vertices: list[tuple[ET.Element, tuple[float, float, float, float]]] = []
    boxes: dict[str, tuple[float, float, float, float]] = {}
    all_x: list[float] = []
    all_y: list[float] = []

    for cell in cells:
        if cell.get("vertex") != "1":
            continue
        parent = by_id.get(cell.get("parent"))
        geom = cell.find("mxGeometry")
        if geom is None or geom.get("relative") == "1" or (parent is not None and parent.get("edge") == "1"):
            continue
        x, y = number(geom.get("x")), number(geom.get("y"))
        w, h = number(geom.get("width")), number(geom.get("height"))
        box = (x, y, w, h)
        vertices.append((cell, box))
        boxes[cell.get("id")] = box
        all_x.extend([x, x + w])
        all_y.extend([y, y + h])

    edges = [cell for cell in cells if cell.get("edge") == "1"]
    for edge in edges:
        geom = edge.find("mxGeometry")
        if geom is None:
            continue
        for point in geom.findall(".//mxPoint"):
            if point.get("x") is not None and point.get("y") is not None:
                all_x.append(number(point.get("x")))
                all_y.append(number(point.get("y")))

    if not all_x or not all_y:
        raise ValueError("Aucune géométrie exploitable")
    pad = 55.0
    min_x, max_x = min(all_x) - pad, max(all_x) + pad
    min_y, max_y = min(all_y) - pad, max(all_y) + pad
    width, height = max_x - min_x, max_y - min_y
    target_height = max(1, round(target_width * height / width))

    gradients: list[str] = []
    edge_shapes: list[str] = []
    edge_labels: list[str] = []
    node_shapes: list[str] = []
    node_text: list[str] = []

    for edge_index, edge in enumerate(edges):
        styles = style_map(edge.get("style"))
        source_box = boxes.get(edge.get("source"))
        target_box = boxes.get(edge.get("target"))
        geom = edge.find("mxGeometry")
        points: list[tuple[float, float]] = []
        if source_box is not None and target_box is not None:
            start = endpoint(source_box, styles, "exit", target_box)
            end = endpoint(target_box, styles, "entry", source_box)
            explicit: list[tuple[float, float]] = []
            if geom is not None:
                array = geom.find("Array")
                if array is not None:
                    explicit = [(number(p.get("x")), number(p.get("y"))) for p in array.findall("mxPoint")]
            if explicit:
                points = [start, *explicit, end]
            else:
                ex, ey = number(styles.get("exitX"), 0.5), number(styles.get("exitY"), 0.5)
                if abs(ey - 0.5) < 0.2 and abs(ex - 0.5) >= 0.2:
                    middle_x = (start[0] + end[0]) / 2
                    points = [start, (middle_x, start[1]), (middle_x, end[1]), end]
                elif abs(ex - 0.5) < 0.2 and abs(ey - 0.5) >= 0.2:
                    middle_y = (start[1] + end[1]) / 2
                    points = [start, (start[0], middle_y), (end[0], middle_y), end]
                elif abs(end[0] - start[0]) >= abs(end[1] - start[1]):
                    middle_x = (start[0] + end[0]) / 2
                    points = [start, (middle_x, start[1]), (middle_x, end[1]), end]
                else:
                    middle_y = (start[1] + end[1]) / 2
                    points = [start, (start[0], middle_y), (end[0], middle_y), end]
        elif geom is not None:
            sp = geom.find("mxPoint[@as='sourcePoint']")
            tp = geom.find("mxPoint[@as='targetPoint']")
            if sp is not None and tp is not None:
                points = [(number(sp.get("x")), number(sp.get("y"))), (number(tp.get("x")), number(tp.get("y")))]
        if len(points) < 2:
            continue

        color = styles.get("strokeColor", "#2F75B5")
        stroke_width = number(styles.get("strokeWidth"), 1.5)
        dash = ' stroke-dasharray="6 4"' if styles.get("dashed") == "1" else ""
        point_string = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
        edge_shapes.append(
            f'<polyline points="{point_string}" fill="none" stroke="{esc(color)}" '
            f'stroke-width="{stroke_width:.2f}" stroke-linejoin="round" stroke-linecap="round"{dash}/>'
        )

        if styles.get("startArrow") == "diamond":
            a, b = points[0], points[1]
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = max(0.001, math.hypot(dx, dy))
            ux, uy = dx / length, dy / length
            px, py = -uy, ux
            size = number(styles.get("startSize"), 14)
            diamond = [
                a,
                (a[0] + ux * size * 0.8 + px * size * 0.42, a[1] + uy * size * 0.8 + py * size * 0.42),
                (a[0] + ux * size * 1.6, a[1] + uy * size * 1.6),
                (a[0] + ux * size * 0.8 - px * size * 0.42, a[1] + uy * size * 0.8 - py * size * 0.42),
            ]
            dpoints = " ".join(f"{x:.2f},{y:.2f}" for x, y in diamond)
            fill = color if styles.get("startFill", "1") == "1" else "#FFFFFF"
            edge_shapes.append(f'<polygon points="{dpoints}" fill="{esc(fill)}" stroke="{esc(color)}" stroke-width="1.4"/>')

        if styles.get("endArrow") == "open":
            a, b = points[-2], points[-1]
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = max(0.001, math.hypot(dx, dy))
            ux, uy = dx / length, dy / length
            px, py = -uy, ux
            size = 12
            left = (b[0] - ux * size + px * size * 0.5, b[1] - uy * size + py * size * 0.5)
            right = (b[0] - ux * size - px * size * 0.5, b[1] - uy * size - py * size * 0.5)
            edge_shapes.append(
                f'<polyline points="{left[0]:.2f},{left[1]:.2f} {b[0]:.2f},{b[1]:.2f} {right[0]:.2f},{right[1]:.2f}" '
                f'fill="none" stroke="{esc(color)}" stroke-width="1.5"/>'
            )

        relation = (edge.get("value") or "").strip()
        if relation:
            mx, my = point_on_path(points, 0.5)
            font_size = number(styles.get("fontSize"), 10)
            label_width = max(22, len(plain_lines(relation)[0] if plain_lines(relation) else relation) * font_size * 0.54 + 8)
            edge_labels.append(f'<rect x="{mx-label_width/2:.2f}" y="{my-font_size-3:.2f}" width="{label_width:.2f}" height="{font_size+7:.2f}" fill="#FFFFFF" fill-opacity="0.92"/>')
            edge_labels.append(svg_text(mx, my + 1, plain_lines(relation)[0] if plain_lines(relation) else relation, font_size, styles.get("fontColor", "#334155"), "middle"))

        child_labels = [cell for cell in cells if cell.get("parent") == edge.get("id") and cell.get("vertex") == "1"]
        for child in child_labels:
            child_geom = child.find("mxGeometry")
            if child_geom is None:
                continue
            relative_x = number(child_geom.get("x"), 0.0)
            fraction = (relative_x + 1.0) / 2.0
            lx, ly = point_on_path(points, fraction)
            offset = child_geom.find("mxPoint")
            if offset is not None:
                lx += number(offset.get("x"))
                ly += number(offset.get("y"))
            label_styles = style_map(child.get("style"))
            value = " ".join(plain_lines(child.get("value") or ""))
            font_size = number(label_styles.get("fontSize"), 10)
            label_width = max(18, len(value) * font_size * 0.58 + 7)
            edge_labels.append(f'<rect x="{lx-label_width/2:.2f}" y="{ly-font_size+1:.2f}" width="{label_width:.2f}" height="{font_size+5:.2f}" fill="#FFFFFF" fill-opacity="0.96"/>')
            edge_labels.append(svg_text(lx, ly + 1, value, font_size, label_styles.get("fontColor", "#172B4D"), "middle", bold=label_styles.get("fontStyle") == "1"))

    for node_index, (cell, (x, y, w, h)) in enumerate(vertices):
        styles = style_map(cell.get("style"))
        value = cell.get("value") or ""
        fill = styles.get("fillColor", "#FFFFFF")
        gradient = styles.get("gradientColor")
        stroke = styles.get("strokeColor", "#2F75B5")
        stroke_width = number(styles.get("strokeWidth"), 1.3)
        is_text = "text" in styles and "shape" not in styles and "fillColor" not in styles
        if fill == "none":
            fill = "none"
        fill_ref = fill
        if gradient and fill != "none":
            gradient_id = f"grad-{node_index}"
            gradients.append(
                f'<linearGradient id="{gradient_id}" x1="0" y1="0" x2="0" y2="1">'
                f'<stop offset="0%" stop-color="{esc(fill)}"/><stop offset="100%" stop-color="{esc(gradient)}"/>'
                f'</linearGradient>'
            )
            fill_ref = f"url(#{gradient_id})"
        if not is_text:
            if styles.get("shape") == "note":
                fold = min(28.0, w * 0.11, h * 0.16)
                points = f"{x},{y} {x+w-fold},{y} {x+w},{y+fold} {x+w},{y+h} {x},{y+h}"
                node_shapes.append(f'<polygon points="{points}" fill="{fill_ref}" stroke="{esc(stroke)}" stroke-width="{stroke_width:.2f}"/>')
                node_shapes.append(f'<polyline points="{x+w-fold},{y} {x+w-fold},{y+fold} {x+w},{y+fold}" fill="none" stroke="{esc(stroke)}" stroke-width="{stroke_width:.2f}"/>')
            else:
                radius = 12 if styles.get("rounded") == "1" else 0
                stroke_attr = "none" if stroke == "none" else esc(stroke)
                node_shapes.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{radius}" fill="{fill_ref}" stroke="{stroke_attr}" stroke-width="{stroke_width:.2f}"/>')

        font_color = styles.get("fontColor", "#172B4D")
        font_size = number(styles.get("fontSize"), 11)
        align = styles.get("align", "left")
        if "<hr" in value.lower():
            head, body = re.split(r"(?i)<hr\s*/?>", value, maxsplit=1)
            header_lines = plain_lines(head)
            body_lines = plain_lines(body)
            if header_lines:
                node_text.append(svg_text(x + w / 2, y + 17, header_lines[0], 10, font_color, "middle"))
            if len(header_lines) > 1:
                node_text.append(svg_text(x + w / 2, y + 36, header_lines[1], 12, font_color, "middle", bold=True))
            node_text.append(f'<line x1="{x:.2f}" y1="{y+49:.2f}" x2="{x+w:.2f}" y2="{y+49:.2f}" stroke="{esc(stroke)}" stroke-width="0.8"/>')
            ty = y + 67
            for line in body_lines:
                if ty > y + h - 5:
                    break
                node_text.append(svg_text(x + 9, ty, line, 11, font_color))
                ty += 14.2
        else:
            lines = plain_lines(value)
            if not lines:
                continue
            if styles.get("whiteSpace") == "wrap" or styles.get("shape") == "note":
                lines = wrap_lines(lines, max(20, w - 16), font_size)
            line_height = font_size * 1.25
            total_height = len(lines) * line_height
            vertical = styles.get("verticalAlign", "middle")
            if vertical == "top":
                ty = y + font_size + number(styles.get("spacing"), 5)
            elif vertical == "bottom":
                ty = y + h - total_height + font_size
            else:
                ty = y + (h - total_height) / 2 + font_size
            anchor = "middle" if align == "center" else ("end" if align == "right" else "start")
            tx = x + w / 2 if align == "center" else (x + w - 5 if align == "right" else x + 5)
            bold = styles.get("fontStyle") == "1"
            italic = styles.get("fontStyle") == "2"
            for line in lines:
                node_text.append(svg_text(tx, ty, line, font_size, font_color, anchor, bold=bold, italic=italic))
                ty += line_height

    svg = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{target_width}" height="{target_height}" viewBox="{min_x:.2f} {min_y:.2f} {width:.2f} {height:.2f}">',
        '<rect x="-100000" y="-100000" width="200000" height="200000" fill="#FFFFFF"/>',
        '<defs>', *gradients, '</defs>',
        *edge_shapes, *node_shapes, *node_text, *edge_labels,
        '</svg>',
    ]
    output.write_text("\n".join(svg), encoding="utf-8")
    print(f"SVG {diagram.get('name')} -> {output.name} ({target_width}x{target_height})")


root = ET.parse(SOURCE).getroot()
diagrams = root.findall("diagram")
for page_index, (filename, target_width) in EXPORTS.items():
    render_page(diagrams[page_index], OUT_DIR / filename, target_width)


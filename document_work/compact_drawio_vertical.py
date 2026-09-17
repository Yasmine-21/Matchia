from __future__ import annotations

import argparse
import bisect
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Callable


def number(value: str) -> float:
    return float(value)


def formatted(value: float) -> str:
    rounded = round(value, 3)
    if rounded.is_integer():
        return str(int(rounded))
    return f"{rounded:.3f}".rstrip("0").rstrip(".")


def scale_y(value: str, anchor: float, factor: float) -> str:
    y = number(value)
    if y <= anchor:
        return formatted(y)
    return formatted(anchor + (y - anchor) * factor)


def message_rows(root: ET.Element, anchor: float) -> list[float]:
    rows: set[float] = set()
    for cell in root.findall(".//mxCell"):
        if cell.get("edge") != "1":
            continue
        style = cell.get("style", "")
        if "endArrow=block" not in style and "endArrow=open" not in style:
            continue
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue
        source = geometry.find("mxPoint[@as='sourcePoint']")
        target = geometry.find("mxPoint[@as='targetPoint']")
        if source is None or target is None:
            continue
        source_y = source.get("y")
        if source_y is not None and number(source_y) > anchor:
            rows.add(number(source_y))
    return sorted(rows)


def normalized_mapper(
    rows: list[float], anchor: float, factor: float, min_gap: float, max_gap: float
) -> Callable[[float], float]:
    old_points = [anchor, *rows]
    first_gap = max(min_gap, min(max_gap, (rows[0] - anchor) * factor))
    new_points = [anchor, anchor + first_gap]
    for previous, current in zip(rows, rows[1:]):
        gap = max(min_gap, min(max_gap, (current - previous) * factor))
        new_points.append(new_points[-1] + gap)

    def mapper(y: float) -> float:
        if y <= anchor:
            return y
        if y >= old_points[-1]:
            return new_points[-1] + (y - old_points[-1]) * factor
        index = bisect.bisect_right(old_points, y) - 1
        old_a, old_b = old_points[index], old_points[index + 1]
        new_a, new_b = new_points[index], new_points[index + 1]
        ratio = (y - old_a) / (old_b - old_a)
        return new_a + ratio * (new_b - new_a)

    return mapper


def compact(
    source: Path,
    destination: Path,
    factor: float,
    anchor: float,
    min_gap: float | None = None,
    max_gap: float | None = None,
) -> None:
    tree = ET.parse(source)
    root = tree.getroot()

    models = root.findall(".//mxGraphModel")
    old_page_height = max(number(model.get("pageHeight", "2355")) for model in models)
    rows = message_rows(root, anchor)
    if min_gap is not None and max_gap is not None and rows:
        mapper = normalized_mapper(rows, anchor, factor, min_gap, max_gap)
    else:
        mapper = lambda y: y if y <= anchor else anchor + (y - anchor) * factor

    new_page_height = mapper(old_page_height)

    for model in models:
        model.set("pageHeight", formatted(new_page_height))
        model.set("dy", formatted(new_page_height))

    for cell in root.findall(".//mxCell"):
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue

        original_y = geometry.get("y")
        original_height = geometry.get("height")
        if original_y is not None and number(original_y) > anchor:
            original_y_number = number(original_y)
            geometry.set("y", formatted(mapper(original_y_number)))

            style = cell.get("style", "")
            width = geometry.get("width")
            is_activation = width == "16"
            is_fragment = "fillOpacity=18" in style
            if original_height is not None and (is_activation or is_fragment):
                original_end = original_y_number + number(original_height)
                geometry.set("height", formatted(mapper(original_end) - mapper(original_y_number)))

        for point in geometry.findall(".//mxPoint"):
            point_y = point.get("y")
            if point_y is not None:
                point.set("y", formatted(mapper(number(point_y))))

    max_element_y = 0.0
    for cell in root.findall(".//mxCell"):
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue
        if geometry.get("y") is not None:
            max_element_y = max(
                max_element_y,
                number(geometry.get("y")) + number(geometry.get("height")),
            )
        for point in geometry.findall(".//mxPoint"):
            if point.get("y") is not None:
                max_element_y = max(max_element_y, number(point.get("y")))

    final_page_height = max(new_page_height, max_element_y + 80.0)
    for model in models:
        model.set("pageHeight", formatted(final_page_height))
        model.set("dy", formatted(final_page_height))

    destination.parent.mkdir(parents=True, exist_ok=True)
    tree.write(destination, encoding="utf-8", xml_declaration=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Compacte verticalement un diagramme Draw.io éditable.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--factor", type=float, default=0.62)
    parser.add_argument("--anchor", type=float, default=168.0)
    parser.add_argument("--min-gap", type=float)
    parser.add_argument("--max-gap", type=float)
    args = parser.parse_args()

    if not 0.4 <= args.factor <= 0.9:
        raise ValueError("Le facteur doit être compris entre 0.4 et 0.9.")
    if (args.min_gap is None) != (args.max_gap is None):
        raise ValueError("--min-gap et --max-gap doivent être fournis ensemble.")
    if args.min_gap is not None and args.min_gap > args.max_gap:
        raise ValueError("--min-gap ne peut pas dépasser --max-gap.")
    compact(
        args.source,
        args.destination,
        args.factor,
        args.anchor,
        args.min_gap,
        args.max_gap,
    )


if __name__ == "__main__":
    main()

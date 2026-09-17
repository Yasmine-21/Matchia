from __future__ import annotations

import argparse
import bisect
import statistics
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


def num(value: str | None, default: float = 0.0) -> float:
    return float(value) if value is not None else default


def fmt(value: float) -> str:
    rounded = round(value, 3)
    if rounded.is_integer():
        return str(int(rounded))
    return f"{rounded:.3f}".rstrip("0").rstrip(".")


@dataclass
class Shape:
    cell: ET.Element
    geometry: ET.Element
    old_x: float
    old_y: float
    old_w: float
    old_h: float
    new_x: float = 0.0
    new_y: float = 0.0
    new_w: float = 0.0
    new_h: float = 0.0


def is_terminal(shape: Shape) -> bool:
    return shape.old_w <= 90 and shape.old_h <= 90


def is_decision(shape: Shape) -> bool:
    style = shape.cell.get("style", "").lower()
    return "rhombus" in style or (360 <= shape.old_w <= 440 and shape.old_h >= 100)


def resized_dimensions(shape: Shape) -> tuple[float, float]:
    if is_terminal(shape):
        return 56.0, 56.0
    if is_decision(shape):
        return min(320.0, shape.old_w * 0.80), min(90.0, shape.old_h * 0.78)

    if shape.old_w >= 600:
        width = shape.old_w * 0.72
    elif shape.old_w >= 500:
        width = shape.old_w * 0.82
    elif shape.old_w >= 350:
        width = shape.old_w * 0.80
    else:
        width = shape.old_w

    if shape.old_h >= 80:
        height = 64.0
    elif shape.old_h >= 65:
        height = 60.0
    else:
        height = max(52.0, shape.old_h)
    return round(width, 3), round(height, 3)


def row_groups(shapes: list[Shape], tolerance: float) -> list[list[Shape]]:
    groups: list[list[Shape]] = []
    for shape in sorted(shapes, key=lambda item: item.old_y):
        if not groups or shape.old_y - min(item.old_y for item in groups[-1]) > tolerance:
            groups.append([shape])
        else:
            groups[-1].append(shape)
    return groups


def main_center(shapes: list[Shape]) -> float:
    candidates = [
        shape.old_x + shape.old_w / 2
        for shape in shapes
        if not is_terminal(shape) and not is_decision(shape) and shape.old_w >= 500 and shape.old_x < 800
    ]
    if not candidates:
        candidates = [shape.old_x + shape.old_w / 2 for shape in shapes]
    return float(statistics.median(candidates))


def resize(source: Path, destination: Path, gap: float, tolerance: float, horizontal_factor: float) -> None:
    tree = ET.parse(source)
    root = tree.getroot()
    model = root.find(".//mxGraphModel")
    graph_root = root.find(".//mxGraphModel/root")
    if model is None or graph_root is None:
        raise ValueError("Structure Draw.io invalide.")

    shapes: list[Shape] = []
    for cell in graph_root.findall("mxCell"):
        geometry = cell.find("mxGeometry")
        if cell.get("vertex") != "1" or geometry is None:
            continue
        if geometry.get("x") is None or geometry.get("y") is None:
            continue
        shape = Shape(
            cell=cell,
            geometry=geometry,
            old_x=num(geometry.get("x")),
            old_y=num(geometry.get("y")),
            old_w=num(geometry.get("width")),
            old_h=num(geometry.get("height")),
        )
        shape.new_w, shape.new_h = resized_dimensions(shape)
        shapes.append(shape)

    if not shapes:
        raise ValueError("Aucune forme redimensionnable.")

    center = main_center(shapes)
    for shape in shapes:
        old_center = shape.old_x + shape.old_w / 2
        new_center = center + (old_center - center) * horizontal_factor
        shape.new_x = max(30.0, new_center - shape.new_w / 2)

    groups = row_groups(shapes, tolerance)
    old_axis: list[float] = []
    new_axis: list[float] = []
    previous_bottom: float | None = None

    for group in groups:
        old_top = min(item.old_y for item in group)
        old_bottom = max(item.old_y + item.old_h for item in group)
        new_top = 30.0 if previous_bottom is None else previous_bottom + gap
        for shape in group:
            relative_offset = (shape.old_y - old_top) * 0.67
            shape.new_y = new_top + relative_offset

        # Preserve a visible horizontal corridor between parallel branches.
        previous_right: float | None = None
        for shape in sorted(group, key=lambda item: item.new_x):
            if previous_right is not None and shape.new_x < previous_right + 24.0:
                shape.new_x = previous_right + 24.0
            previous_right = shape.new_x + shape.new_w

        new_bottom = max(shape.new_y + shape.new_h for shape in group)
        old_axis.extend((old_top, old_bottom))
        new_axis.extend((new_top, new_bottom))
        previous_bottom = new_bottom

    mapping = sorted(zip(old_axis, new_axis))
    old_axis = [pair[0] for pair in mapping]
    new_axis = [pair[1] for pair in mapping]

    def map_y(y: float) -> float:
        if y <= old_axis[0]:
            return new_axis[0] + (y - old_axis[0]) * 0.67
        if y >= old_axis[-1]:
            return new_axis[-1] + (y - old_axis[-1]) * 0.67
        index = bisect.bisect_right(old_axis, y) - 1
        old_a, old_b = old_axis[index], old_axis[index + 1]
        new_a, new_b = new_axis[index], new_axis[index + 1]
        if old_b == old_a:
            return new_a
        ratio = (y - old_a) / (old_b - old_a)
        return new_a + ratio * (new_b - new_a)

    def map_x(x: float) -> float:
        return center + (x - center) * horizontal_factor

    for shape in shapes:
        shape.geometry.set("x", fmt(shape.new_x))
        shape.geometry.set("y", fmt(shape.new_y))
        shape.geometry.set("width", fmt(shape.new_w))
        shape.geometry.set("height", fmt(shape.new_h))

    for cell in list(graph_root.findall("mxCell")):
        if cell.get("edge") != "1":
            continue
        if not cell.get("source") and not cell.get("target"):
            graph_root.remove(cell)
            continue
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue
        if cell.get("source") and cell.get("target"):
            for point in list(geometry.findall("mxPoint")):
                if point.get("as") in {"sourcePoint", "targetPoint"}:
                    geometry.remove(point)
        for point in geometry.findall(".//mxPoint"):
            if point.get("x") is not None:
                point.set("x", fmt(map_x(num(point.get("x")))))
            if point.get("y") is not None:
                point.set("y", fmt(map_y(num(point.get("y")))))

    remaining_cells = graph_root.findall("mxCell")
    max_x = max(shape.new_x + shape.new_w for shape in shapes)
    max_y = max(shape.new_y + shape.new_h for shape in shapes)
    for cell in remaining_cells:
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue
        for point in geometry.findall(".//mxPoint"):
            max_x = max(max_x, num(point.get("x")))
            max_y = max(max_y, num(point.get("y")))

    page_width = max(1100.0, max_x + 50.0)
    page_height = max_y + 80.0
    model.set("pageWidth", fmt(page_width))
    model.set("pageHeight", fmt(page_height))
    model.set("dx", fmt(page_width))
    model.set("dy", fmt(page_height))

    destination.parent.mkdir(parents=True, exist_ok=True)
    tree.write(destination, encoding="utf-8", xml_declaration=True)


def cli() -> None:
    parser = argparse.ArgumentParser(description="Réduit et compacte les cadres d’un diagramme d’activité.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--gap", type=float, default=24.0)
    parser.add_argument("--row-tolerance", type=float, default=30.0)
    parser.add_argument("--horizontal-factor", type=float, default=0.72)
    args = parser.parse_args()
    resize(args.source, args.destination, args.gap, args.row_tolerance, args.horizontal_factor)


if __name__ == "__main__":
    cli()

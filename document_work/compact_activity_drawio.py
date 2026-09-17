from __future__ import annotations

import argparse
import bisect
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


def value_as_float(value: str | None, default: float = 0.0) -> float:
    return float(value) if value is not None else default


def formatted(value: float) -> str:
    rounded = round(value, 3)
    if rounded.is_integer():
        return str(int(rounded))
    return f"{rounded:.3f}".rstrip("0").rstrip(".")


@dataclass
class Vertex:
    geometry: ET.Element
    y: float
    height: float


def group_rows(vertices: list[Vertex], tolerance: float) -> list[list[Vertex]]:
    groups: list[list[Vertex]] = []
    for vertex in sorted(vertices, key=lambda item: item.y):
        if not groups or vertex.y - min(item.y for item in groups[-1]) > tolerance:
            groups.append([vertex])
        else:
            groups[-1].append(vertex)
    return groups


def compact(source: Path, destination: Path, gap: float, row_tolerance: float, bottom_margin: float) -> None:
    tree = ET.parse(source)
    root = tree.getroot()
    model = root.find(".//mxGraphModel")
    if model is None:
        raise ValueError("mxGraphModel introuvable.")

    vertices: list[Vertex] = []
    for cell in root.findall(".//mxCell"):
        if cell.get("vertex") != "1":
            continue
        geometry = cell.find("mxGeometry")
        if geometry is None or geometry.get("y") is None or geometry.get("height") is None:
            continue
        vertices.append(
            Vertex(
                geometry=geometry,
                y=value_as_float(geometry.get("y")),
                height=value_as_float(geometry.get("height")),
            )
        )

    if not vertices:
        raise ValueError("Aucun sommet positionné n’a été trouvé.")

    groups = group_rows(vertices, row_tolerance)
    mapping_points: list[tuple[float, float]] = []
    previous_new_bottom: float | None = None

    for group in groups:
        old_top = min(item.y for item in group)
        old_bottom = max(item.y + item.height for item in group)
        new_top = old_top if previous_new_bottom is None else previous_new_bottom + gap
        for item in group:
            item.geometry.set("y", formatted(new_top + item.y - old_top))
        new_bottom = new_top + (old_bottom - old_top)
        mapping_points.extend(((old_top, new_top), (old_bottom, new_bottom)))
        previous_new_bottom = new_bottom

    mapping_points = sorted(set(mapping_points))
    old_axis = [item[0] for item in mapping_points]
    new_axis = [item[1] for item in mapping_points]

    def map_y(y: float) -> float:
        if y <= old_axis[0]:
            return y
        if y >= old_axis[-1]:
            return new_axis[-1] + (y - old_axis[-1]) * 0.5
        index = bisect.bisect_right(old_axis, y) - 1
        old_a, old_b = old_axis[index], old_axis[index + 1]
        new_a, new_b = new_axis[index], new_axis[index + 1]
        if old_b == old_a:
            return new_a
        ratio = (y - old_a) / (old_b - old_a)
        return new_a + ratio * (new_b - new_a)

    max_point_y = new_axis[-1]
    for cell in root.findall(".//mxCell"):
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue
        for point in geometry.findall(".//mxPoint"):
            if point.get("y") is None:
                continue
            mapped = map_y(value_as_float(point.get("y")))
            point.set("y", formatted(mapped))
            max_point_y = max(max_point_y, mapped)

    page_height = max(new_axis[-1], max_point_y) + bottom_margin
    model.set("pageHeight", formatted(page_height))
    model.set("dy", formatted(page_height))

    destination.parent.mkdir(parents=True, exist_ok=True)
    tree.write(destination, encoding="utf-8", xml_declaration=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Compacte les rangées d’un diagramme d’activité Draw.io.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--gap", type=float, default=28.0)
    parser.add_argument("--row-tolerance", type=float, default=30.0)
    parser.add_argument("--bottom-margin", type=float, default=80.0)
    args = parser.parse_args()
    compact(args.source, args.destination, args.gap, args.row_tolerance, args.bottom_margin)


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
import xml.etree.ElementTree as ET
from pathlib import Path


GEOMETRY = {
    "start": (482, 30, 56, 56),
    "open": (258, 110, 504, 64),
    "credentials": (258, 198, 504, 64),
    "verify": (258, 286, 504, 64),
    "valid": (350, 374, 320, 90),
    "credentialError": (814, 386, 432, 64),
    "session": (258, 488, 504, 64),
    "redirect": (258, 576, 504, 64),
    "end": (482, 664, 56, 56),
}


def set_geometry(cell: ET.Element, values: tuple[float, float, float, float]) -> None:
    geometry = cell.find("mxGeometry")
    if geometry is None:
        raise ValueError(f"Géométrie absente pour {cell.get('id')}")
    x, y, width, height = values
    geometry.set("x", str(x))
    geometry.set("y", str(y))
    geometry.set("width", str(width))
    geometry.set("height", str(height))


def resize(source: Path, destination: Path) -> None:
    tree = ET.parse(source)
    root = tree.getroot()
    model = root.find(".//mxGraphModel")
    graph_root = root.find(".//mxGraphModel/root")
    if model is None or graph_root is None:
        raise ValueError("Structure Draw.io invalide.")

    cells = {cell.get("id"): cell for cell in graph_root.findall("mxCell")}
    for cell_id, values in GEOMETRY.items():
        cell = cells.get(cell_id)
        if cell is None:
            raise ValueError(f"Cellule attendue absente : {cell_id}")
        set_geometry(cell, values)

    # Remove dangling remnants that have neither a source nor a target. They do
    # not represent UML flows and unnecessarily enlarge the editable canvas.
    for cell in list(graph_root.findall("mxCell")):
        if cell.get("edge") == "1" and not cell.get("source") and not cell.get("target"):
            graph_root.remove(cell)

    # Let Draw.io route the valid decision-to-session connector from its cells.
    decision_yes = cells.get("edge-4")
    if decision_yes is not None:
        geometry = decision_yes.find("mxGeometry")
        if geometry is not None:
            for point in list(geometry.findall("mxPoint")):
                if point.get("as") in {"sourcePoint", "targetPoint"}:
                    geometry.remove(point)

    # Keep the correction loop outside the resized error frame.
    correction = cells.get("edge-6")
    if correction is not None:
        geometry = correction.find("mxGeometry")
        points = geometry.find("Array[@as='points']") if geometry is not None else None
        if points is not None:
            route = [(1270, 418), (1270, 230)]
            for point, (x, y) in zip(points.findall("mxPoint"), route):
                point.set("x", str(x))
                point.set("y", str(y))

    model.set("pageWidth", "1300")
    model.set("pageHeight", "800")
    model.set("dx", "1300")
    model.set("dy", "800")

    destination.parent.mkdir(parents=True, exist_ok=True)
    tree.write(destination, encoding="utf-8", xml_declaration=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Réduit les cadres du diagramme d’authentification.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    resize(args.source, args.destination)


if __name__ == "__main__":
    main()

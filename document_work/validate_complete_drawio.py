from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def cells(diagram):
    return list(diagram.findall("./mxGraphModel/root/mxCell"))


def validate_sequence(path: Path) -> None:
    root = ET.parse(path).getroot()
    diagrams = root.findall("diagram")
    expected = [
        (5, 13, 4, 2),
        (6, 28, 6, 2),
        (8, 30, 8, 2),
        (6, 17, 4, 2),
        (6, 18, 4, 2),
        (5, 16, 4, 2),
        (7, 25, 5, 2),
        (5, 15, 4, 1),
        (5, 13, 4, 2),
    ]
    assert len(diagrams) == len(expected), (len(diagrams), len(expected))
    for diagram, (p_count, m_count, a_count, f_count) in zip(diagrams, expected):
        page_cells = cells(diagram)
        participants = [c for c in page_cells if c.get("vertex") == "1" and "«" in c.get("value", "")]
        activations = [
            c for c in page_cells
            if c.get("vertex") == "1"
            and c.find("mxGeometry") is not None
            and c.find("mxGeometry").get("width") == "16"
        ]
        frames = [c for c in page_cells if c.get("vertex") == "1" and "fillOpacity=18" in c.get("style", "")]
        lifelines = []
        messages = []
        for c in page_cells:
            if c.get("edge") != "1":
                continue
            style = c.get("style", "")
            geom = c.find("mxGeometry")
            source = geom.find("mxPoint[@as='sourcePoint']") if geom is not None else None
            target = geom.find("mxPoint[@as='targetPoint']") if geom is not None else None
            if (
                "startArrow=none" in style
                and "endArrow=none" in style
                and source is not None
                and target is not None
                and source.get("x") == target.get("x")
            ):
                lifelines.append(c)
            elif "endArrow=block" in style or "endArrow=open" in style:
                messages.append(c)
        actual = (len(participants), len(messages), len(activations), len(frames), len(lifelines))
        wanted = (p_count, m_count, a_count, f_count, p_count)
        assert actual == wanted, f"{diagram.get('name')}: actual={actual} wanted={wanted}"
        print(f"SEQUENCE OK {diagram.get('name')}: participants={p_count}, messages={m_count}, activations={a_count}, fragments={f_count}")


def validate_activity(path: Path) -> None:
    root = ET.parse(path).getroot()
    diagrams = root.findall("diagram")
    assert len(diagrams) == 6, len(diagrams)
    for diagram in diagrams:
        page_cells = cells(diagram)
        title = [c for c in page_cells if c.get("id") == "title" and c.get("vertex") == "1"]
        vertices = [c for c in page_cells if c.get("vertex") == "1" and c.get("id") != "title"]
        edges = [c for c in page_cells if c.get("edge") == "1"]
        assert len(title) == 1, diagram.get("name")
        assert len(vertices) >= 15, (diagram.get("name"), len(vertices))
        assert len(edges) >= 14, (diagram.get("name"), len(edges))
        assert all(c.get("source") and c.get("target") for c in edges), diagram.get("name")
        print(f"ACTIVITY OK {diagram.get('name')}: nodes={len(vertices)}, flows={len(edges)}")


if __name__ == "__main__":
    validate_activity(Path(sys.argv[1]))
    validate_sequence(Path(sys.argv[2]))

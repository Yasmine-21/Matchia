# Reference

- Source: `D:\PFE - BRI Technology\Rapport\Master Report.docx`
- SHA-256: `d8f6bb0fee7666dd072d5bcbfbbbde5a13cf54ddd734f8641477f5517521bc96`
- Size: 11,479,811 bytes
- Render: 108 pages in `template-reference-render`
- Sections: 13
- Evidence: `style_details.json`, `template-style-evidence.json`, `package_inventory.json`, and `report_structure.json`

# Page system

- All 13 sections use A4 portrait pages, 8.27 x 11.69 inches.
- Margins are 0.98 inches on all sides.
- Every section starts on a new page.
- Section-specific headers and footers must be preserved. Sections 2, 3, 5, and 8 through 13 use their own headers; page numbers are field-backed in footer parts.
- Existing chapter pages use a chapter-specific header, a thin horizontal separator, and a bottom-right page number.

# Typography

- Body text uses Times New Roman, 12 pt, justified, with the source paragraph rhythm.
- Main chapter headings use Heading 1 with direct 18 pt bold formatting and centered alignment.
- Numbered chapter sections use Heading 2 with direct 16 pt bold formatting.
- Numbered subsections use the source custom style `isselectedend` with direct 14 pt bold formatting.
- Captions use the existing Caption style, 9 pt italic, and are centered when associated with a figure.
- New headings and captions must reuse these existing source patterns rather than introduce new styles.

# Content flow and slot map

- Chapter 3 starts at source paragraph 338 and spans rendered pages 46 through 54.
- Section 4 starts at source paragraph 374. Its final technology table ends immediately before source paragraph 387.
- Editable insertion slot: before paragraph 387, currently `5. Conclusion`.
- Insert `5. Diagramme de classe`, its introductory text, the global class diagram, five detailed subsections with diagrams and explanations, then rename the existing conclusion to `6. Conclusion`.
- Preserve Chapter 4 and every later chapter unchanged apart from pagination and field results caused by the insertion.

# Figures

- Use inline images only.
- Center each diagram and keep its caption directly below it.
- Use the source Caption style and figure numbering field pattern.
- Use report-oriented diagrams with large labels and selected principal attributes so they remain readable at A4 content width.

# Package preservation

- Preserve styles, numbering, headers, footers, existing media, relationships, bookmarks, comments, custom XML, and section properties.
- New media, image relationships, paragraphs, figure fields, and bookmarks required by the inserted section are editable.
- The source file must remain unchanged and the final report must be written to a different path.

# Fidelity gates

- The reference source hash must remain unchanged.
- All existing content before and after the insertion must remain structurally present.
- Existing section count, page size, margins, headers, footers, and current images must remain intact.
- Render and inspect every final page. Pay special attention to the newly inserted section, its figures, the renamed conclusion, the Chapter 4 transition, page headers, page numbers, and updated table of contents.

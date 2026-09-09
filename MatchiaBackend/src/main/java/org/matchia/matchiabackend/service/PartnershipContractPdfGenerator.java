package org.matchia.matchiabackend.service;

import org.springframework.stereotype.Component;
import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

/** Dependency-free PDF writer for the immutable contract archive. */
@Component
public class PartnershipContractPdfGenerator {
    private static final Charset PDF_CHARSET = Charset.forName("windows-1252");

    public byte[] generate(String text) {
        ContractSections sections = sections(text);
        PdfDocument document = new PdfDocument();
        for (String meta : sections.meta()) document.write(meta, 9, false, "0.10 0.13 0.20", 92, 2);
        document.y -= 8;
        drawParties(document, sections.bank(), sections.dealer());
        for (String introduction : sections.introduction()) document.write(introduction, 9, false, "0.10 0.13 0.20", 92, 3);
        for (String bodyLine : sections.body()) {
            if (bodyLine.startsWith("Article ")) {
                document.ensure(34);
                document.rule(document.y + 7);
                document.write(bodyLine, 11, true, "0.04 0.23 0.44", 84, 4);
            } else {
                document.write(bodyLine, 9, false, "0.10 0.13 0.20", 92, 2);
            }
        }
        drawSignatures(document, sections.signatures());
        return pdf(document.finish());
    }

    private ContractSections sections(String text) {
        List<String> lines = text.lines().map(String::trim).filter(line -> !line.isBlank()).toList();
        int bankIndex = indexOf(lines, "La Banque");
        int dealerIndex = indexOf(lines, "Le Concessionnaire");
        int articleIndex = firstIndex(lines, line -> line.startsWith("Article "));
        int signatureIndex = firstIndex(lines, line -> line.startsWith("Banque —"));
        int bodyEnd = signatureIndex >= 0 ? signatureIndex : lines.size();

        List<String> meta = copy(lines, 0, bankIndex < 0 ? Math.min(2, lines.size()) : bankIndex);
        meta.removeIf(line -> "MATCHIA".equals(line) || "CONTRAT DE PARTENARIAT".equals(line));
        List<String> bank = copy(lines, bankIndex + 1, dealerIndex < 0 ? bankIndex + 1 : dealerIndex);
        int introductionStart = dealerIndex + 1;
        int introductionEnd = articleIndex < 0 ? bodyEnd : articleIndex;
        List<String> dealerAndIntroduction = copy(lines, introductionStart, introductionEnd);
        List<String> dealer = new ArrayList<>();
        List<String> introduction = new ArrayList<>();
        for (String line : dealerAndIntroduction) {
            if (line.startsWith("Ci-après")) introduction.add(line); else dealer.add(line);
        }
        List<String> body = copy(lines, articleIndex < 0 ? bodyEnd : articleIndex, bodyEnd);
        List<String> signatures = copy(lines, signatureIndex < 0 ? lines.size() : signatureIndex, lines.size());
        return new ContractSections(meta, bank, dealer, introduction, body, signatures);
    }

    private void drawParties(PdfDocument document, List<String> bank, List<String> dealer) {
        int bankRows = rows(bank, 32);
        int dealerRows = rows(dealer, 32);
        int height = Math.max(94, 31 + Math.max(bankRows, dealerRows) * 13);
        document.ensure(height + 16);
        int top = document.y;
        partyBox(document.page, 48, top, 238, height, "1. LA BANQUE", bank);
        partyBox(document.page, 309, top, 238, height, "2. LE CONCESSIONNAIRE", dealer);
        document.y -= height + 13;
    }

    private void partyBox(StringBuilder page, int x, int top, int width, int height, String title, List<String> details) {
        int bottom = top - height;
        page.append("0.97 0.98 1 rg ").append(x).append(' ').append(bottom).append(' ').append(width).append(' ').append(height).append(" re f\n");
        page.append("0.75 0.80 0.87 RG ").append(x).append(' ').append(bottom).append(' ').append(width).append(' ').append(height).append(" re S\n");
        lineAt(page, x + 12, top - 19, title, 9, true, "0.04 0.23 0.44");
        int y = top - 37;
        for (String detail : details) {
            for (String row : wrap(detail, 32)) {
                lineAt(page, x + 12, y, row, 8, false, "0.10 0.13 0.20");
                y -= 13;
            }
        }
    }

    private void drawSignatures(PdfDocument document, List<String> signatures) {
        if (signatures.isEmpty()) return;
        int height = Math.max(80, 34 + Math.max(rows(signatures, 36), 3) * 12);
        document.ensure(height + 18);
        int top = document.y - 6;
        document.rule(top + 5);
        signatureBox(document.page, 48, top, 220, height, "POUR LA BANQUE", signatures, true);
        signatureBox(document.page, 327, top, 220, height, "POUR LE PARTENAIRE", signatures, false);
        document.y -= height + 16;
    }

    private void signatureBox(StringBuilder page, int x, int top, int width, int height, String title, List<String> details, boolean bank) {
        lineAt(page, x + 8, top - 18, title, 8, true, "0.04 0.23 0.44");
        int y = top - 35;
        boolean include = bank;
        for (String detail : details) {
            if (detail.startsWith("Concessionnaire —")) include = !bank;
            if (detail.startsWith("Banque —")) include = bank;
            if (!include) continue;
            for (String row : wrap(detail, 34)) {
                lineAt(page, x + 8, y, row, 8, false, "0.10 0.13 0.20");
                y -= 12;
            }
        }
        page.append("0.48 0.55 0.65 RG ").append(x + 8).append(' ').append(top - height + 16).append(" m ").append(x + width - 8).append(' ').append(top - height + 16).append(" l S\n");
    }

    private int startPage(StringBuilder page, int pageNumber, boolean firstPage) {
        if (firstPage) {
            lineAt(page, 48, 798, "MATCHIA", 9, true, "0.04 0.23 0.44");
            centered(page, 776, "CONTRAT DE PARTENARIAT", 18, true, "0.04 0.23 0.44");
            page.append("0.04 0.23 0.44 RG 48 762 m 547 762 l S\n");
            return 742;
        }
        lineAt(page, 48, 798, "MATCHIA  |  CONTRAT DE PARTENARIAT", 9, true, "0.04 0.23 0.44");
        page.append("0.86 0.90 0.95 RG 48 790 m 547 790 l S\n");
        return 772;
    }

    private void footer(StringBuilder page, int pageNumber) {
        page.append("0.45 0.50 0.58 rg BT /F1 8 Tf 48 32 Td (Document genere par Matchia) Tj ET\n");
        page.append("0.45 0.50 0.58 rg BT /F1 8 Tf 500 32 Td (Page ").append(pageNumber).append(") Tj ET\n");
    }

    private void lineAt(StringBuilder out, int x, int y, String value, int size, boolean bold, String color) {
        out.append(color).append(" rg BT /").append(bold ? "F2" : "F1").append(' ').append(size)
                .append(" Tf ").append(x).append(' ').append(y).append(" Td (").append(escape(value)).append(") Tj ET\n");
    }
    private void centered(StringBuilder out, int y, String value, int size, boolean bold, String color) { lineAt(out, Math.max(48, (595 - (int) (value.length() * size * .54)) / 2), y, value, size, bold, color); }
    private int indexOf(List<String> lines, String value) { return lines.indexOf(value); }
    private int firstIndex(List<String> lines, java.util.function.Predicate<String> predicate) { for (int i = 0; i < lines.size(); i++) if (predicate.test(lines.get(i))) return i; return -1; }
    private List<String> copy(List<String> lines, int from, int to) { return new ArrayList<>(lines.subList(Math.max(0, Math.min(from, lines.size())), Math.max(0, Math.min(to, lines.size())))); }
    private int rows(List<String> lines, int width) { return lines.stream().mapToInt(line -> Math.max(1, wrap(line, width).size())).sum(); }
    private List<String> wrap(String text, int width) { List<String> rows = new ArrayList<>(); StringBuilder row = new StringBuilder(); for (String word : text.trim().split("\\s+")) { if (row.length() + word.length() + 1 > width) { rows.add(row.toString()); row.setLength(0); } if (!row.isEmpty()) row.append(' '); row.append(word); } if (!row.isEmpty()) rows.add(row.toString()); return rows; }
    private String escape(String text) { return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").replace("—", "-").replace("’", "'"); }
    private byte[] pdf(List<String> pages) {
        List<byte[]> objects = new ArrayList<>(); int count = pages.size(); StringBuilder kids = new StringBuilder(); for (int i = 0; i < count; i++) kids.append(5 + i * 2).append(" 0 R ");
        objects.add(bytes("<< /Type /Catalog /Pages 2 0 R >>")); objects.add(bytes("<< /Type /Pages /Kids [" + kids + "] /Count " + count + " >>"));
        objects.add(bytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")); objects.add(bytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
        for (int i = 0; i < count; i++) { int content = 6 + i * 2; objects.add(bytes("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + content + " 0 R >>")); String stream = pages.get(i); objects.add(bytes("<< /Length " + bytes(stream).length + " >>\nstream\n" + stream + "endstream")); }
        try { ByteArrayOutputStream out = new ByteArrayOutputStream(); out.write(bytes("%PDF-1.4\n%")); out.write(new byte[]{(byte) 0xE2, (byte) 0xE3, (byte) 0xCF, (byte) 0xD3, '\n'}); List<Integer> offsets = new ArrayList<>(); offsets.add(0); for (int i = 0; i < objects.size(); i++) { offsets.add(out.size()); out.write(bytes((i + 1) + " 0 obj\n")); out.write(objects.get(i)); out.write(bytes("\nendobj\n")); } int xref = out.size(); out.write(bytes("xref\n0 " + (objects.size() + 1) + "\n0000000000 65535 f \n")); for (int i = 1; i < offsets.size(); i++) out.write(bytes(String.format("%010d 00000 n \n", offsets.get(i)))); out.write(bytes("trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF")); return out.toByteArray(); } catch (java.io.IOException e) { throw new IllegalStateException("Impossible de générer le PDF.", e); }
    }
    private byte[] bytes(String value) { return value.getBytes(PDF_CHARSET); }

    private record ContractSections(List<String> meta, List<String> bank, List<String> dealer, List<String> introduction,
                                    List<String> body, List<String> signatures) {}

    private final class PdfDocument {
        private final List<String> pages = new ArrayList<>();
        private StringBuilder page = new StringBuilder();
        private int pageNumber = 1;
        private int y = startPage(page, pageNumber, true);

        private void ensure(int requiredHeight) {
            if (y - requiredHeight >= 68) return;
            footer(page, pageNumber);
            pages.add(page.toString());
            page = new StringBuilder();
            pageNumber++;
            y = startPage(page, pageNumber, false);
        }

        private void write(String value, int size, boolean bold, String color, int width, int gap) {
            for (String row : wrap(value, width)) {
                ensure(size + 7);
                lineAt(page, 48, y, row, size, bold, color);
                y -= size + 5;
            }
            y -= gap;
        }

        private void rule(int yPosition) {
            page.append("0.80 0.84 0.90 RG 48 ").append(yPosition).append(" m 547 ").append(yPosition).append(" l S\n");
        }

        private List<String> finish() {
            footer(page, pageNumber);
            pages.add(page.toString());
            return pages;
        }
    }
}

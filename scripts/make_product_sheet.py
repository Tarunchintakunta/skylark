#!/usr/bin/env python3
"""One-page SKYLARK EXIM product sheet — matches the site's palette and voice."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

INK = HexColor("#04070b")
SEA = HexColor("#0a131c")
WHITE = HexColor("#edf3f7")
GREY = HexColor("#8ea0ac")
GREY_DIM = HexColor("#55676f")
GOLD = HexColor("#c9a24b")

W, H = A4
c = canvas.Canvas("assets/skylark-product-sheet.pdf", pagesize=A4)

# background
c.setFillColor(INK)
c.rect(0, 0, W, H, stroke=0, fill=1)

M = 18 * mm
y = H - 24 * mm

# brand row
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 13)
c.drawString(M, y, "SKYLARK EXIM")
c.setFillColor(GREY_DIM)
c.setFont("Helvetica", 7.5)
c.drawString(M + 42 * mm, y + 1, "V I S A K H A P A T N A M   ·   I N D I A")
c.setFillColor(GOLD)
c.setFont("Helvetica", 7.5)
c.drawRightString(W - M, y + 1, "PRODUCT SHEET · 2026")
y -= 6 * mm
c.setStrokeColor(HexColor("#22303a"))
c.setLineWidth(0.6)
c.line(M, y, W - M, y)

# headline
y -= 16 * mm
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 26)
c.drawString(M, y, "TWO ORIGINS. ONE STANDARD.")
y -= 8 * mm
c.setFillColor(GREY)
c.setFont("Helvetica", 9.5)
c.drawString(M, y, "Wild-caught fish from the Bay of Bengal. Farmed shrimp from the Andhra coast.")
y -= 5 * mm
c.drawString(M, y, "One cold chain, one residue standard, one door to the world.")

def section(title, yy):
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(M, yy, title.upper())
    c.setStrokeColor(HexColor("#22303a"))
    c.line(M, yy - 2.5 * mm, W - M, yy - 2.5 * mm)
    return yy - 9 * mm

def row(label, value, yy):
    c.setFillColor(GREY_DIM)
    c.setFont("Helvetica", 8.5)
    c.drawString(M, yy, label)
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 8.5)
    c.drawString(M + 46 * mm, yy, value)
    return yy - 5.2 * mm

# products
y -= 14 * mm
y = section("Farmed shrimp — Litopenaeus vannamei / Penaeus monodon", y)
y = row("Formats", "HOSO · HLSO · PUD · PTO · Block & IQF", y)
y = row("Grades (per kg)", "10/20 · 21/25 · 26/30 · 31/40 · 41/50", y)
y = row("Glaze / packing", "To buyer specification · master cartons, -20 °C core", y)
y = row("Origin record", "Pond ID, feed log, input record, harvest date — per batch", y)

y -= 6 * mm
y = section("Wild-caught sea fish — Bay of Bengal", y)
y = row("Species", "Yellowfin tuna · Swordfish · Indian mackerel · Ribbonfish · Croaker · Cuttlefish", y)
y = row("Handling", "On ice within minutes of the water · landed same morning", y)
y = row("Formats", "Whole round · Gilled & gutted · Fillet · IQF on request", y)

y -= 6 * mm
y = section("One standard — every batch", y)
y = row("Residue testing", "Tested against EU and US limits — whichever is stricter", y)
y = row("Protocol", "Full HACCP · certificate travels with the carton", y)
y = row("Cold chain", "+4 °C intake → 0 °C process → -18 °C IQF → -20 °C store & reefer", y)
y = row("Capacity", "700 pallet positions · unbroken chain to port of discharge", y)

y -= 6 * mm
y = section("Markets served", y)
y = row("Routes", "European Union · Japan · GCC · North America", y)
y = row("Port of lading", "Visakhapatnam, Andhra Pradesh, India", y)

# footer
c.setFillColor(SEA)
c.rect(0, 0, W, 26 * mm, stroke=0, fill=1)
c.setFillColor(GOLD)
c.setFont("Helvetica-Bold", 9)
c.drawString(M, 16 * mm, "REQUEST SPECIFICATIONS")
c.setFillColor(GREY)
c.setFont("Helvetica", 8)
c.drawString(M, 10.5 * mm, "exports@skylarkexim.example   ·   +91 000 000 0000   ·   skylarkexim.example")
c.setFillColor(GREY_DIM)
c.drawRightString(W - M, 10.5 * mm, "© 2026 Skylark Exim")

c.showPage()
c.save()
print("assets/skylark-product-sheet.pdf written")

import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

pdf_path = r"C:\Users\VIRTUALTECH\Downloads\Bueno_Logistics_Platform_Testing_Walkthrough_and_Credentials.pdf"

# Landscape 11 x 8.5 inches (Carousel Slide Deck)
doc = SimpleDocTemplate(
    pdf_path,
    pagesize=landscape(letter),
    rightMargin=36,
    leftMargin=36,
    topMargin=30,
    bottomMargin=30
)

styles = getSampleStyleSheet()

# Carousel Slide Title Styles
slide_title = ParagraphStyle(
    'SlideTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=20,
    leading=24,
    textColor=colors.HexColor('#0E4B88'),
    spaceAfter=2
)

slide_subtitle = ParagraphStyle(
    'SlideSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=14,
    textColor=colors.HexColor('#62BC37'),
    spaceAfter=12
)

card_title = ParagraphStyle(
    'CardTitle',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=16,
    textColor=colors.HexColor('#0f172a'),
    spaceBefore=4,
    spaceAfter=8
)

body_style = ParagraphStyle(
    'SlideBody',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#1e293b'),
    spaceAfter=6
)

bullet_style = ParagraphStyle(
    'SlideBullet',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13.5,
    textColor=colors.HexColor('#334155'),
    spaceAfter=5
)

code_style = ParagraphStyle(
    'SlideCode',
    parent=styles['BodyText'],
    fontName='Courier-Bold',
    fontSize=9.5,
    leading=12,
    textColor=colors.HexColor('#0284c7')
)

th_style = ParagraphStyle(
    'TH',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=11,
    textColor=colors.HexColor('#0E4B88')
)

td_style = ParagraphStyle(
    'TD',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=11,
    textColor=colors.HexColor('#1e293b')
)

badge_style = ParagraphStyle(
    'Badge',
    parent=styles['Normal'],
    fontName='Courier-Bold',
    fontSize=10,
    leading=12,
    textColor=colors.HexColor('#15803d')
)

story = []

def add_header(title, step_badge="CAROUSEL SLIDE"):
    story.append(Table([
        [
            Paragraph(f"<b>BUENO FREIGHT OS 360</b> &nbsp;|&nbsp; <font color='#62BC37'>{step_badge}</font>", ParagraphStyle('TopNav', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0E4B88'))),
            Paragraph("<b>LIVE PLATFORM:</b> https://360.specklessinnovations.com/", ParagraphStyle('TopRight', fontName='Helvetica', fontSize=9, alignment=2, textColor=colors.HexColor('#64748b')))
        ]
    ], colWidths=[400, 320], style=[('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#62BC37'), spaceAfter=10))
    story.append(Paragraph(title, slide_title))

# ─────────────────────────────────────────────────────────
# SLIDE 1: COVER CARD
# ─────────────────────────────────────────────────────────
add_header("CAROUSEL DECK: TESTING WALKTHROUGH & LOGIN DIRECTORY", "SLIDE 1 OF 7")
story.append(Paragraph("Complete Testing Handbook for Bueno Freight Operating System Platform", slide_subtitle))
story.append(Spacer(1, 10))

cover_card = [
    [Paragraph("<b>PLATFORM OVERVIEW & ARCHITECTURE</b>", ParagraphStyle('CT', fontName='Helvetica-Bold', fontSize=12, textColor=colors.HexColor('#0E4B88')))],
    [Paragraph("The <b>Bueno Freight OS Platform (360)</b> is an enterprise rail logistics management system providing end-to-end cargo tracking, automated stopwatch loading/offloading duration auditing, real-time mobile device phone GPS telemetry, sequential trip ID generation, and official station offload manifest generation.", body_style)],
    [Paragraph("<b>CORE TESTING NODES & CAPABILITIES:</b>", ParagraphStyle('CT2', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0f172a')))],
    [Paragraph("• <b>Ewekoro Terminal (EWK)</b>: Origin loading node for rail deals, wagon picking, and escort GPS dispatch.", bullet_style)],
    [Paragraph("• <b>Moniya Yard Ibadan (MNY)</b>: Destination receiving yard for train offloading, wagon inventory transfer, and manifest printing.", bullet_style)],
    [Paragraph("• <b>Apapa Maritime Port (APT)</b>: Intermodal port hub for maritime freight intake.", bullet_style)],
    [Paragraph("• <b>Executive Command (HQ)</b>: High-precision satellite corridor GPS map, live tonnage analytics, and fund request approvals.", bullet_style)],
]
t_cover = Table(cover_card, colWidths=[720])
t_cover.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
    ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ('PADDING', (0,0), (-1,-1), 12),
]))
story.append(t_cover)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────
# SLIDE 2: EXECUTIVE & COMMAND STAFF CREDENTIALS CARD
# ─────────────────────────────────────────────────────────
add_header("EXECUTIVE & COMMAND STAFF LOGIN CREDENTIALS", "SLIDE 2 OF 7")
story.append(Paragraph("Bank-App Style Quick PIN Unlock Logins for Executive Portals", slide_subtitle))

exec_data = [
    [Paragraph("Role / Designation", th_style), Paragraph("Staff Name", th_style), Paragraph("Staff ID", th_style), Paragraph("PIN", th_style), Paragraph("Email Address", th_style), Paragraph("Portal Responsibilities & Access", th_style)],
    [Paragraph("<b>Admin Officer</b>", td_style), Paragraph("Folake Adeyemi", td_style), Paragraph("EXEC-03", code_style), Paragraph("7777", badge_style), Paragraph("admin@bueno.ng", td_style), Paragraph("Full System Control, Deal Creation, User Provisioning, Fleet Management", td_style)],
    [Paragraph("<b>Head of Operations</b>", td_style), Paragraph("Babajide Sanwo", td_style), Paragraph("EXEC-02", code_style), Paragraph("8888", badge_style), Paragraph("ops.command@bueno.ng", td_style), Paragraph("Operational Command, Live Phone GPS Telemetry, Corridor Map Oversight", td_style)],
    [Paragraph("<b>Chief Executive Officer</b>", td_style), Paragraph("Alhaji Bashir Umar", td_style), Paragraph("EXEC-01", code_style), Paragraph("9999", badge_style), Paragraph("ceo@bueno.ng", td_style), Paragraph("Executive Oversight, Tonnage Analytics, Weekly Business Reports", td_style)],
    [Paragraph("<b>Head of Finance</b>", td_style), Paragraph("Chinenye Nnamdi", td_style), Paragraph("EXEC-04", code_style), Paragraph("6666", badge_style), Paragraph("finance@bueno.ng", td_style), Paragraph("Financial Auditing, Station Expense Disbursement, Fund Clearances", td_style)],
]
t_exec = Table(exec_data, colWidths=[110, 100, 60, 45, 130, 275])
t_exec.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('PADDING', (0,0), (-1,-1), 8),
]))
story.append(t_exec)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────
# SLIDE 3: STATION CARGO OFFICERS CREDENTIALS CARD
# ─────────────────────────────────────────────────────────
add_header("STATION CARGO OFFICERS LOGIN DIRECTORY", "SLIDE 3 OF 7")
story.append(Paragraph("Login Selection: Staff Member ➔ Cargo Officer ➔ Station Node ➔ Officer Name ➔ PIN", slide_subtitle))

cargo_data = [
    [Paragraph("Terminal Node", th_style), Paragraph("Cargo Officer Name", th_style), Paragraph("Staff ID", th_style), Paragraph("PIN", th_style), Paragraph("Assigned Terminal Operational Duties", th_style)],
    [Paragraph("<b>Ewekoro Terminal (EWK)</b>", td_style), Paragraph("Samuel Okafor", td_style), Paragraph("EWK-02", code_style), Paragraph("2222", badge_style), Paragraph("Deal pickup, wagon picking, loading stopwatch timers, escort GPS, trip dispatch", td_style)],
    [Paragraph("<b>Ewekoro Terminal (EWK)</b>", td_style), Paragraph("Ade Bello", td_style), Paragraph("EWK-01", code_style), Paragraph("1111", badge_style), Paragraph("Deal pickup, wagon picking, loading stopwatch timers, escort GPS, trip dispatch", td_style)],
    [Paragraph("<b>Moniya Yard (MNY)</b>", td_style), Paragraph("Musa Ibrahim", td_style), Paragraph("MNY-01", code_style), Paragraph("1111", badge_style), Paragraph("Incoming inspection, offloading timers, bag reconciliation, manifest sign-off", td_style)],
    [Paragraph("<b>Moniya Yard (MNY)</b>", td_style), Paragraph("Kassim Ahmed", td_style), Paragraph("MNY-02", code_style), Paragraph("2222", badge_style), Paragraph("Incoming inspection, offloading timers, bag reconciliation, manifest sign-off", td_style)],
    [Paragraph("<b>Apapa Port (APT)</b>", td_style), Paragraph("Ngozi Eze", td_style), Paragraph("APT-01", code_style), Paragraph("1111", badge_style), Paragraph("Port freight intake, intermodal wagon dispatch, cargo loading oversight", td_style)],
]
t_cargo = Table(cargo_data, colWidths=[130, 110, 60, 45, 375])
t_cargo.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('PADDING', (0,0), (-1,-1), 7),
]))
story.append(t_cargo)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────
# SLIDE 4: INDUSTRIAL CLIENTS CREDENTIALS CARD
# ─────────────────────────────────────────────────────────
add_header("INDUSTRIAL CLIENT CONSIGNEE LOGINS", "SLIDE 4 OF 7")
story.append(Paragraph("Client Portal Credentials for Booking, Tracking & Digital Manifest Inspection", slide_subtitle))

client_data = [
    [Paragraph("Company Name", th_style), Paragraph("Contact Desk", th_style), Paragraph("Login Identifier (Email / Phone)", th_style), Paragraph("PIN", th_style), Paragraph("Customer Portal Capabilities", th_style)],
    [Paragraph("<b>Dangote Cement</b>", td_style), Paragraph("Freight Desk", td_style), Paragraph("freight@dangotecement.ng / 08038889900", td_style), Paragraph("1111", badge_style), Paragraph("Consignment booking, live satellite train tracking, digital manifest inspection", td_style)],
    [Paragraph("<b>Lafarge Africa Plc</b>", td_style), Paragraph("Logistics Desk", td_style), Paragraph("logistics@lafarge.ng / 08037778899", td_style), Paragraph("1111", badge_style), Paragraph("Consignment booking, live satellite train tracking, digital manifest inspection", td_style)],
    [Paragraph("<b>BUA Cement</b>", td_style), Paragraph("Logistics Desk", td_style), Paragraph("logistics@buacement.ng / 08039990011", td_style), Paragraph("1111", badge_style), Paragraph("Consignment booking, live satellite train tracking, digital manifest inspection", td_style)],
]
t_client = Table(client_data, colWidths=[110, 90, 210, 45, 265])
t_client.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('PADDING', (0,0), (-1,-1), 8),
]))
story.append(t_client)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────
# SLIDE 5: WORKFLOW PHASE 1 & 2 CARD
# ─────────────────────────────────────────────────────────
add_header("WORKFLOW PHASES 1 & 2: DEAL CREATION & TRIP INITIATION", "SLIDE 5 OF 7")
story.append(Paragraph("From Admin Freight Deal Creation to Cargo Officer Sequential Trip Pickup", slide_subtitle))

phase1_card = [
    [Paragraph("<b>PHASE 1: FREIGHT DEAL CREATION (Admin Portal)</b>", ParagraphStyle('P1', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0E4B88')))],
    [Paragraph("• Log in as <b>Admin Officer</b> (<code>Folake Adeyemi</code>, PIN: <code>7777</code>).", bullet_style)],
    [Paragraph("• Go to <b>Manage Deals</b> ➔ Click <b>+ Create New Freight Deal</b>.", bullet_style)],
    [Paragraph("• Select Consignee (e.g. <i>Dangote Cement</i>), Loading Station (<i>Ewekoro Terminal</i>), Destination (<i>Moniya Yard</i>), Quantity (<i>27,600 Bags / 23 Wagons</i>).", bullet_style)],
    [Paragraph("• Click <b>Create Official Freight Deal</b>. Real-time notifications fire to Operations, CEO, and Ewekoro Cargo Officers.", bullet_style)],
    [Paragraph("<b>PHASE 2: TRIP CREATION & SEQUENTIAL ID (Loading Cargo Officer)</b>", ParagraphStyle('P2', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#62BC37')))],
    [Paragraph("• Log in as <b>Cargo Officer at Ewekoro Terminal</b> (e.g. <code>Samuel Okafor</code>, PIN: <code>2222</code>).", bullet_style)],
    [Paragraph("• Under <b>New Pending Deals</b>, locate the deal ➔ Click <b>+ Create Trip from Deal ➔</b>.", bullet_style)],
    [Paragraph("• Enter Locomotive Engine ID (e.g. <i>L2205 - GE Locomotive Engine</i>).", bullet_style)],
    [Paragraph("• Click <b>Begin Wagon Loading ➔</b>. The system generates an orderly sequential <b>Trip ID</b> (e.g. <code>TRIP-001</code>).", bullet_style)],
]
t_p1 = Table(phase1_card, colWidths=[720])
t_p1.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
    ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ('PADDING', (0,0), (-1,-1), 10),
]))
story.append(t_p1)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────
# SLIDE 6: WORKFLOW PHASE 3 & 4 CARD
# ─────────────────────────────────────────────────────────
add_header("WORKFLOW PHASES 3 & 4: WAGON LOADING & GPS DISPATCH", "SLIDE 6 OF 7")
story.append(Paragraph("Stopwatch Timers per Wagon & Real-Time Mobile Device Escort Phone GPS", slide_subtitle))

phase2_card = [
    [Paragraph("<b>PHASE 3: WAGON SELECTION & STOPWATCH TIMING</b>", ParagraphStyle('P3', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0E4B88')))],
    [Paragraph("• Select available PXG Wagons from fleet inventory (e.g. <i>PXG 09029</i>, <i>PXG 09033</i>).", bullet_style)],
    [Paragraph("• Click <b>Start Load ➔</b> to trigger live digital stopwatch loading timer.", bullet_style)],
    [Paragraph("• When physically loaded, click <b>Stop Load ✓</b> and enter verified loaded bags (e.g. <i>1,200 Bags</i>).", bullet_style)],
    [Paragraph("<b>PHASE 4: PHONE GPS CONNECTION & IN-TRANSIT DISPATCH</b>", ParagraphStyle('P4', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#62BC37')))],
    [Paragraph("• Enter Supervising Escort Phone Number (e.g. <i>08032223344</i>).", bullet_style)],
    [Paragraph("• Click <b>Connect Phone GPS & Track 📍</b> to stream real latitude, longitude, and speed from the device.", bullet_style)],
    [Paragraph("• Click <b>Dispatch Trip In-Transit 🚆➔</b>. Status changes to <b>IN_TRANSIT</b>.", bullet_style)],
    [Paragraph("• Admin, Operations, CEO, and Customer track the live moving train on the <b>Interactive Satellite Corridor Map</b>.", bullet_style)],
]
t_p2 = Table(phase2_card, colWidths=[720])
t_p2.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
    ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ('PADDING', (0,0), (-1,-1), 10),
]))
story.append(t_p2)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────
# SLIDE 7: WORKFLOW PHASE 5 & 6 CARD
# ─────────────────────────────────────────────────────────
add_header("WORKFLOW PHASES 5 & 6: UNLOADING YARD & MANIFEST PRINTING", "SLIDE 7 OF 7")
story.append(Paragraph("Moniya Yard Receiving, Automatic Wagon Station Transfer & Offload Manifest", slide_subtitle))

phase3_card = [
    [Paragraph("<b>PHASE 5: DESTINATION UNLOADING & AUTO FLEET LOCATION TRANSFER</b>", ParagraphStyle('P5', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0E4B88')))],
    [Paragraph("• Log in as <b>Unloading Cargo Officer at Moniya Yard</b> (e.g. <code>Musa Ibrahim</code>, PIN: <code>1111</code>).", bullet_style)],
    [Paragraph("• Under <b>Incoming Consignments</b>, locate <i>TRIP-001</i> ➔ Click <b>Inspect Consignment & Begin Unload ➔</b>.", bullet_style)],
    [Paragraph("• Run unloading timers per wagon (click <b>Start Unload ➔</b> and <b>Stop Unload ✓</b>).", bullet_style)],
    [Paragraph("• <b>Automatic Fleet Transfer</b>: Unloaded wagons automatically update location in database to <b>MNY (Moniya Yard)</b> for return empties/freight.", bullet_style)],
    [Paragraph("<b>PHASE 6: MANIFEST GENERATION & VARIANCE FLAGGING</b>", ParagraphStyle('P6', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#62BC37')))],
    [Paragraph("• Click <b>Finalize Trip & Complete Unloading ✓</b>. Status updates to <b>COMPLETED</b>.", bullet_style)],
    [Paragraph("• System generates <b>Official Station Manifest & Offload Report</b> matching company spreadsheets.", bullet_style)],
    [Paragraph("• <b>Discrepancy Flagging</b>: If deal volume (e.g. <i>15,000 Bags</i>) exceeds loaded volume (<i>2,400 Bags</i>), a <b>⚠️ PARTIAL DISPATCH DETECTED</b> banner highlights the remaining balance.", bullet_style)],
    [Paragraph("• Click <b>🖨️ Print Official Trip Audit</b> to generate paper/PDF report.", bullet_style)],
]
t_p3 = Table(phase3_card, colWidths=[720])
t_p3.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
    ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ('PADDING', (0,0), (-1,-1), 10),
]))
story.append(t_p3)

doc.build(story)
print("PDF Carousel generated successfully at:", pdf_path)

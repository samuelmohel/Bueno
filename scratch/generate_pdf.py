import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

pdf_path = r"C:\Users\VIRTUALTECH\Downloads\Bueno_Logistics_Platform_Testing_Walkthrough_and_Credentials.pdf"

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=36,
    leftMargin=36,
    topMargin=36,
    bottomMargin=36
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=colors.HexColor('#0E4B88'),
    alignment=TA_LEFT,
    spaceAfter=4
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10.5,
    leading=13,
    textColor=colors.HexColor('#62BC37'),
    alignment=TA_LEFT,
    spaceAfter=10
)

h2_style = ParagraphStyle(
    'DocH2',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=16,
    textColor=colors.HexColor('#0E4B88'),
    spaceBefore=12,
    spaceAfter=6
)

h3_style = ParagraphStyle(
    'DocH3',
    parent=styles['Heading3'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=13,
    textColor=colors.HexColor('#0f172a'),
    spaceBefore=8,
    spaceAfter=4
)

body_style = ParagraphStyle(
    'DocBody',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=9,
    leading=12.5,
    textColor=colors.HexColor('#1e293b'),
    spaceAfter=4
)

code_style = ParagraphStyle(
    'DocCode',
    parent=styles['BodyText'],
    fontName='Courier-Bold',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#0284c7')
)

th_style = ParagraphStyle(
    'TH',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=8,
    leading=10,
    textColor=colors.HexColor('#0E4B88')
)

td_style = ParagraphStyle(
    'TD',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8,
    leading=10,
    textColor=colors.HexColor('#1e293b')
)

story = []

# Header
story.append(Paragraph("BUENO LOGISTICS FREIGHT OS (360 PLATFORM)", title_style))
story.append(Paragraph("Comprehensive End-to-End Testing Walkthrough & User Login Directory", subtitle_style))
story.append(Paragraph("<b>LIVE TESTING PLATFORM URL:</b> https://360.specklessinnovations.com/", body_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#62BC37'), spaceAfter=10))

# Section 1
story.append(Paragraph("KEY SECTION 1: USER LOGIN CREDENTIALS DIRECTORY", h2_style))
story.append(Paragraph("The platform features role-based access control with Bank-App Style Quick PIN Unlock. Use credentials below for testing.", body_style))

# Executive Table
story.append(Paragraph("1.1 Executive & Command Staff Logins", h3_style))
exec_data = [
    [Paragraph("Role", th_style), Paragraph("Staff Name", th_style), Paragraph("Staff ID", th_style), Paragraph("PIN", th_style), Paragraph("Email Address", th_style), Paragraph("Access Level", th_style)],
    [Paragraph("<b>Admin Officer</b>", td_style), Paragraph("Folake Adeyemi", td_style), Paragraph("EXEC-03", code_style), Paragraph("7777", code_style), Paragraph("admin@bueno.ng", td_style), Paragraph("Full Control, Deal Creation, User Accounts, Fleet Management", td_style)],
    [Paragraph("<b>Head of Ops</b>", td_style), Paragraph("Babajide Sanwo", td_style), Paragraph("EXEC-02", code_style), Paragraph("8888", code_style), Paragraph("ops.command@bueno.ng", td_style), Paragraph("Operational Command, Live Phone GPS Telemetry, Satellite Map", td_style)],
    [Paragraph("<b>Chief Executive</b>", td_style), Paragraph("Alhaji Bashir Umar", td_style), Paragraph("EXEC-01", code_style), Paragraph("9999", code_style), Paragraph("ceo@bueno.ng", td_style), Paragraph("Executive Oversight, Tonnage Analytics, Business Reports", td_style)],
    [Paragraph("<b>Head of Finance</b>", td_style), Paragraph("Chinenye Nnamdi", td_style), Paragraph("EXEC-04", code_style), Paragraph("6666", code_style), Paragraph("finance@bueno.ng", td_style), Paragraph("Financial Auditing, Station Expense Disbursement, Fund Approvals", td_style)],
]

t1 = Table(exec_data, colWidths=[90, 80, 50, 35, 110, 175])
t1.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t1)
story.append(Spacer(1, 6))

# Cargo Officer Table
story.append(Paragraph("1.2 Station Cargo Officer Logins (Terminal Operations)", h3_style))
story.append(Paragraph("To log in: Select <b>Staff Member</b> ➔ <b>Cargo Officer</b> ➔ Select Assigned Station ➔ Select Officer Name ➔ Enter PIN.", body_style))

cargo_data = [
    [Paragraph("Station Node", th_style), Paragraph("Cargo Officer Name", th_style), Paragraph("Staff ID", th_style), Paragraph("PIN", th_style), Paragraph("Assigned Operational Duties", th_style)],
    [Paragraph("<b>Ewekoro Terminal (EWK)</b>", td_style), Paragraph("Samuel Okafor", td_style), Paragraph("EWK-02", code_style), Paragraph("2222", code_style), Paragraph("Deal pickup, wagon picking, loading timers, escort GPS, trip dispatch", td_style)],
    [Paragraph("<b>Ewekoro Terminal (EWK)</b>", td_style), Paragraph("Ade Bello", td_style), Paragraph("EWK-01", code_style), Paragraph("1111", code_style), Paragraph("Deal pickup, wagon picking, loading timers, escort GPS, trip dispatch", td_style)],
    [Paragraph("<b>Moniya Yard (MNY)</b>", td_style), Paragraph("Musa Ibrahim", td_style), Paragraph("MNY-01", code_style), Paragraph("1111", code_style), Paragraph("Incoming inspection, offloading timers, bag reconciliation, manifest sign-off", td_style)],
    [Paragraph("<b>Moniya Yard (MNY)</b>", td_style), Paragraph("Kassim Ahmed", td_style), Paragraph("MNY-02", code_style), Paragraph("2222", code_style), Paragraph("Incoming inspection, offloading timers, bag reconciliation, manifest sign-off", td_style)],
    [Paragraph("<b>Apapa Port (APT)</b>", td_style), Paragraph("Ngozi Eze", td_style), Paragraph("APT-01", code_style), Paragraph("1111", code_style), Paragraph("Port freight intake, intermodal wagon dispatch, cargo loading oversight", td_style)],
]

t2 = Table(cargo_data, colWidths=[110, 95, 50, 35, 250])
t2.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t2)
story.append(Spacer(1, 6))

# Customer Table
story.append(Paragraph("1.3 Industrial Client Logins (Customer Portal)", h3_style))
client_data = [
    [Paragraph("Company Name", th_style), Paragraph("Contact Desk", th_style), Paragraph("Login Identifier", th_style), Paragraph("PIN", th_style), Paragraph("Portal Capabilities", th_style)],
    [Paragraph("<b>Dangote Cement</b>", td_style), Paragraph("Freight Desk", td_style), Paragraph("freight@dangotecement.ng / 08038889900", td_style), Paragraph("1111", code_style), Paragraph("Consignment booking, live satellite train tracking, manifest inspection", td_style)],
    [Paragraph("<b>Lafarge Africa Plc</b>", td_style), Paragraph("Logistics Desk", td_style), Paragraph("logistics@lafarge.ng / 08037778899", td_style), Paragraph("1111", code_style), Paragraph("Consignment booking, live satellite train tracking, manifest inspection", td_style)],
    [Paragraph("<b>BUA Cement</b>", td_style), Paragraph("Logistics Desk", td_style), Paragraph("logistics@buacement.ng / 08039990011", td_style), Paragraph("1111", code_style), Paragraph("Consignment booking, live satellite train tracking, manifest inspection", td_style)],
]

t3 = Table(client_data, colWidths=[95, 75, 175, 35, 160])
t3.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t3)
story.append(Spacer(1, 10))

# Section 2
story.append(Paragraph("KEY SECTION 2: END-TO-END OPERATIONAL WORKFLOW WALKTHROUGH", h2_style))

steps = [
    ("STEP 1: INITIATING A FREIGHT DEAL (Admin Portal)", [
        "Log in as <b>Admin Officer</b> (Folake Adeyemi, PIN: 7777).",
        "Navigate to <b>Manage Deals</b> ➔ Click <b>+ Create New Freight Deal</b>.",
        "Enter Consignee (e.g. <i>Dangote Cement</i>), Loading Station (<i>Ewekoro Terminal</i>), Destination (<i>Moniya Yard</i>), Quantity (<i>27,600 Bags / 23 Wagons</i>).",
        "Click <b>Create Official Freight Deal</b>. Real-time notifications fire to Operations, CEO, and Ewekoro Cargo Officers."
    ]),
    ("STEP 2: CREATING A TRIP FROM THE DEAL (Loading Cargo Officer)", [
        "Log in as <b>Cargo Officer at Ewekoro Terminal</b> (e.g. Samuel Okafor, PIN: 2222).",
        "Locate the deal under <b>New Pending Deals</b> ➔ Click <b>+ Create Trip from Deal ➔</b>.",
        "Enter Locomotive Engine ID (e.g. <i>L2205 - GE Locomotive Engine</i>).",
        "Click <b>Begin Wagon Loading ➔</b>. The system generates an orderly sequential <b>Trip ID</b> (e.g. <i>TRIP-001</i>)."
    ]),
    ("STEP 3: PICKING WAGONS & RECORDING LOADING DURATION", [
        "Select available PXG Wagons from fleet inventory (e.g. <i>PXG 09029</i>, <i>PXG 09033</i>).",
        "Click <b>Start Load ➔</b> (triggers live digital stopwatch timer).",
        "When physically loaded, click <b>Stop Load ✓</b> and enter verified loaded bags (e.g. <i>1,200 Bags</i>)."
    ]),
    ("STEP 4: ESCORT PHONE GPS CONNECTION & TRANSIT DISPATCH", [
        "Enter Supervising Escort Phone Number (e.g. <i>08032223344</i>).",
        "Click <b>Connect Phone GPS & Track 📍</b> to stream real device latitude, longitude, and speed.",
        "Click <b>Dispatch Trip In-Transit 🚆➔</b>. Admin, Operations, CEO, and Customer track live train on <b>Satellite Corridor Map</b>."
    ]),
    ("STEP 5: RECEIVING & UNLOADING AT DESTINATION (Moniya Yard)", [
        "Log in as <b>Unloading Cargo Officer at Moniya Yard</b> (e.g. Musa Ibrahim, PIN: 1111).",
        "Locate <i>TRIP-001</i> under <b>Incoming Consignments</b> ➔ Click <b>Inspect Consignment & Begin Unload ➔</b>.",
        "Click <b>Start Unload ➔</b> and <b>Stop Unload ✓</b> for each wagon.",
        "<b>Automatic Fleet Transfer</b>: Unloaded wagons automatically update location in database to <b>MNY (Moniya Yard)</b> for return empties/freight."
    ]),
    ("STEP 6: TRIP COMPLETION & OFFICIAL MANIFEST GENERATION", [
        "Click <b>Finalize Trip & Complete Unloading ✓</b>. Status updates to <b>COMPLETED</b>.",
        "System generates <b>Official Station Manifest & Offload Report</b> matching company spreadsheets.",
        "<b>Discrepancy Flagging</b>: If deal volume (e.g. <i>15,000 Bags</i>) exceeds loaded volume (<i>2,400 Bags</i>), a <b>⚠️ PARTIAL DISPATCH DETECTED</b> banner highlights the remaining balance.",
        "Click <b>🖨️ Print Official Trip Audit</b> to print paper/PDF reports."
    ]),
]

for title, items in steps:
    story.append(Paragraph(f"<b>{title}</b>", h3_style))
    for item in items:
        story.append(Paragraph(f"• {item}", body_style))
    story.append(Spacer(1, 2))

doc.build(story)
print("PDF generated successfully at:", pdf_path)

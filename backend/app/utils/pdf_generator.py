"""
Generador de PDF para Órdenes de Compra INVEX
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, Image, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
import os


# Colores corporativos INVEX
INVEX_RED = colors.HexColor('#C41E3A')
INVEX_GRAY = colors.HexColor('#4A4A4A')
INVEX_LIGHT_GRAY = colors.HexColor('#F5F5F5')
HEADER_BG = colors.HexColor('#8B0000')


def get_logo_path():
    """Obtener ruta del logo de INVEX"""
    # Buscar el logo en diferentes ubicaciones posibles
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    possible_paths = [
        os.path.join(base_dir, 'public', 'images', 'logo-invex.svg'),
        os.path.join(base_dir, 'public', 'images', 'logo-invex.png'),
        os.path.join(base_dir, 'src', 'assets', 'logo-invex.png'),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None


def create_styles():
    """Crear estilos personalizados para el PDF"""
    styles = getSampleStyleSheet()

    # Título principal
    styles.add(ParagraphStyle(
        name='TitleINVEX',
        parent=styles['Title'],
        fontSize=16,
        textColor=INVEX_RED,
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))

    # Subtítulo
    styles.add(ParagraphStyle(
        name='SubtitleINVEX',
        parent=styles['Normal'],
        fontSize=12,
        textColor=INVEX_GRAY,
        spaceAfter=8,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))

    # Sección header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        backColor=HEADER_BG,
        spaceBefore=6,
        spaceAfter=2,
        fontName='Helvetica-Bold',
        leftIndent=6,
        rightIndent=6
    ))

    # Label de campo
    styles.add(ParagraphStyle(
        name='FieldLabel',
        parent=styles['Normal'],
        fontSize=8,
        textColor=INVEX_RED,
        fontName='Helvetica-Bold'
    ))

    # Valor de campo
    styles.add(ParagraphStyle(
        name='FieldValue',
        parent=styles['Normal'],
        fontSize=9,
        textColor=INVEX_GRAY,
        fontName='Helvetica'
    ))

    # Texto normal
    styles.add(ParagraphStyle(
        name='NormalINVEX',
        parent=styles['Normal'],
        fontSize=9,
        textColor=INVEX_GRAY,
        fontName='Helvetica',
        alignment=TA_JUSTIFY
    ))

    # Footer
    styles.add(ParagraphStyle(
        name='FooterINVEX',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.gray,
        alignment=TA_CENTER
    ))

    return styles


def format_date(date_obj):
    """Formatear fecha para mostrar"""
    if date_obj is None:
        return "N/A"
    if isinstance(date_obj, str):
        if not date_obj or date_obj.strip() == '':
            return "N/A"
        try:
            date_obj = datetime.strptime(date_obj, '%Y-%m-%d')
        except:
            try:
                date_obj = datetime.strptime(date_obj, '%d/%m/%Y')
            except:
                return str(date_obj)
    try:
        return date_obj.strftime('%d/%m/%Y')
    except:
        return "N/A"


def format_currency(value):
    """Formatear moneda"""
    if value is None:
        return "$0.00"
    try:
        return f"${float(value):,.2f}"
    except (ValueError, TypeError):
        return "$0.00"


def safe_str(value, default="N/A"):
    """Convertir valor a string de forma segura"""
    if value is None:
        return default
    if isinstance(value, str):
        return value if value.strip() else default
    return str(value)


def generate_orden_compra_pdf(data: dict) -> BytesIO:
    """
    Genera un PDF de orden de compra con formato INVEX

    Args:
        data: Diccionario con los datos de la orden de compra:
            - folio: Número de folio/OC
            - fecha_solicitud: Fecha de la solicitud
            - solicitante: Nombre del solicitante
            - area: Área del solicitante
            - correo: Correo electrónico
            - extension: Extensión telefónica
            - autorizador: Nombre del autorizador
            - clave_presupuestal: Clave presupuestal
            - centro_costos: Centro de costos
            - usuario_bien: Usuario del bien
            - area_usuario: Área del usuario
            - razon_social: Razón social de la empresa
            - area_uso: Área de uso
            - motivo_compra: Motivo de la compra
            - es_compra_unica: Boolean
            - es_compra_regular: Boolean
            - items: Lista de items con descripcion, cantidad, unidad, precio_unitario, total
            - fecha_requerida: Fecha requerida
            - direccion_entrega: Dirección de entrega
            - subtotal: Subtotal
            - iva: IVA
            - total: Total

    Returns:
        BytesIO: Buffer con el PDF generado
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.4*inch,
        leftMargin=0.4*inch,
        topMargin=0.3*inch,
        bottomMargin=0.3*inch
    )

    styles = create_styles()
    elements = []

    # ========== HEADER CON LOGO ==========
    header_data = []

    # Logo (izquierda) - usamos texto estilizado
    logo_cell = Paragraph(
        '<font color="#C41E3A" size="24"><b>invex</b></font><br/>'
        '<font color="#666666" size="8">BANCO</font>',
        ParagraphStyle('logo', alignment=TA_LEFT, leading=14)
    )

    # Título central
    title_cell = Paragraph(
        '<font color="#8B0000" size="14"><b>ORDEN DE COMPRA</b></font>',
        ParagraphStyle('center', alignment=TA_CENTER)
    )

    # Folio (derecha)
    folio = safe_str(data.get('folio'))
    folio_cell = Paragraph(
        f'<font color="#C41E3A" size="10"><b>Folio: {folio}</b></font>',
        ParagraphStyle('right', alignment=TA_RIGHT)
    )

    header_table = Table(
        [[logo_cell, title_cell, folio_cell]],
        colWidths=[2*inch, 3.5*inch, 2*inch]
    )
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)

    # Línea divisoria
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width="100%", thickness=2, color=INVEX_RED))
    elements.append(Spacer(1, 6))

    # ========== DATOS DEL SOLICITANTE ==========
    elements.append(Paragraph("DATOS DEL SOLICITANTE", styles['SectionHeader']))

    solicitante_data = [
        [
            Paragraph("<b>Fecha de Solicitud:</b>", styles['FieldLabel']),
            Paragraph(format_date(data.get('fecha_solicitud')), styles['FieldValue']),
            Paragraph("<b>Extensión:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('extension')), styles['FieldValue']),
        ],
        [
            Paragraph("<b>Solicitante:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('solicitante')), styles['FieldValue']),
            Paragraph("<b>Correo:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('correo')), styles['FieldValue']),
        ],
        [
            Paragraph("<b>Área:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('area')), styles['FieldValue']),
            Paragraph("<b>Autorizador:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('autorizador')), styles['FieldValue']),
        ],
    ]

    solicitante_table = Table(solicitante_data, colWidths=[1.2*inch, 2.3*inch, 1.2*inch, 2.8*inch])
    solicitante_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), INVEX_LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(solicitante_table)

    # ========== DATOS PRESUPUESTALES ==========
    elements.append(Paragraph("DATOS PRESUPUESTALES", styles['SectionHeader']))

    presupuesto_data = [
        [
            Paragraph("<b>Clave Presupuestal:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('clave_presupuestal')), styles['FieldValue']),
            Paragraph("<b>Centro de Costos:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('centro_costos')), styles['FieldValue']),
        ],
        [
            Paragraph("<b>Usuario del Bien:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('usuario_bien')), styles['FieldValue']),
            Paragraph("<b>Área Usuario:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('area_usuario')), styles['FieldValue']),
        ],
        [
            Paragraph("<b>Razón Social:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('razon_social'), 'BANCO INVEX SA INSTITUCION DE BANCA MULTIPLE'), styles['FieldValue']),
            Paragraph("<b>Área de Uso:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('area_uso')), styles['FieldValue']),
        ],
    ]

    presupuesto_table = Table(presupuesto_data, colWidths=[1.2*inch, 2.3*inch, 1.2*inch, 2.8*inch])
    presupuesto_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), INVEX_LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(presupuesto_table)

    # ========== MOTIVO DE COMPRA ==========
    elements.append(Paragraph("MOTIVO DE COMPRA", styles['SectionHeader']))

    # Tipo de compra
    tipo_compra = "Compra Única" if data.get('es_compra_unica') else "Compra Regular"

    motivo_data = [
        [
            Paragraph("<b>Tipo de Compra:</b>", styles['FieldLabel']),
            Paragraph(tipo_compra, styles['FieldValue']),
        ],
        [
            Paragraph("<b>Motivo:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('motivo_compra')), styles['NormalINVEX']),
        ],
    ]

    motivo_table = Table(motivo_data, colWidths=[1.2*inch, 6.3*inch])
    motivo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), INVEX_LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(motivo_table)

    # ========== DETALLE DE PRODUCTOS/SERVICIOS ==========
    elements.append(Paragraph("DESCRIPCIÓN DEL BIEN O SERVICIO", styles['SectionHeader']))

    # Header de la tabla de items - texto blanco sobre fondo oscuro
    header_style = ParagraphStyle('TableHeader', fontSize=8, textColor=colors.white, fontName='Helvetica-Bold', alignment=TA_CENTER)
    items_header = [
        Paragraph("#", header_style),
        Paragraph("DESCRIPCIÓN", header_style),
        Paragraph("CANTIDAD", header_style),
        Paragraph("UNIDAD", header_style),
        Paragraph("P. UNITARIO", header_style),
        Paragraph("TOTAL", header_style),
    ]

    items_data = [items_header]

    # Agregar items
    items = data.get('items', [])
    if not items:
        # Si no hay items, crear uno con la descripción general
        items = [{
            'descripcion': safe_str(data.get('descripcion')),
            'cantidad': data.get('cantidad') or 0,
            'unidad': safe_str(data.get('unidad_medida'), 'PZA'),
            'precio_unitario': data.get('precio_unitario') or 0,
            'total': data.get('costo_total') or 0
        }]

    for idx, item in enumerate(items, 1):
        cantidad = item.get('cantidad') or 0
        row = [
            Paragraph(str(idx), styles['FieldValue']),
            Paragraph(safe_str(item.get('descripcion')), styles['FieldValue']),
            Paragraph(f"{cantidad:,}" if isinstance(cantidad, (int, float)) else str(cantidad), styles['FieldValue']),
            Paragraph(safe_str(item.get('unidad'), 'PZA'), styles['FieldValue']),
            Paragraph(format_currency(item.get('precio_unitario')), styles['FieldValue']),
            Paragraph(format_currency(item.get('total')), styles['FieldValue']),
        ]
        items_data.append(row)

    items_table = Table(
        items_data,
        colWidths=[0.4*inch, 3.2*inch, 0.8*inch, 0.7*inch, 1*inch, 1.4*inch]
    )
    items_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        # Body
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # #
        ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Cantidad
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Unidad
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),  # Precios
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(items_table)

    # ========== TOTALES ==========
    subtotal = data.get('subtotal', data.get('costo_total', 0) / 1.16 if data.get('costo_total') else 0)
    iva = data.get('iva', subtotal * 0.16)
    total = data.get('total', data.get('costo_total', 0))

    totales_data = [
        ['', '', '', '', Paragraph("<b>SUBTOTAL:</b>", styles['FieldLabel']), Paragraph(format_currency(subtotal), styles['FieldValue'])],
        ['', '', '', '', Paragraph("<b>IVA (16%):</b>", styles['FieldLabel']), Paragraph(format_currency(iva), styles['FieldValue'])],
        ['', '', '', '', Paragraph("<b>TOTAL:</b>", styles['FieldLabel']), Paragraph(f"<b>{format_currency(total)}</b>", styles['FieldValue'])],
    ]

    totales_table = Table(
        totales_data,
        colWidths=[0.4*inch, 3.2*inch, 0.8*inch, 0.7*inch, 1*inch, 1.4*inch]
    )
    totales_table.setStyle(TableStyle([
        ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
        ('ALIGN', (5, 0), (5, -1), 'RIGHT'),
        ('BACKGROUND', (4, 2), (5, 2), INVEX_LIGHT_GRAY),
        ('LINEABOVE', (4, 0), (5, 0), 1, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(totales_table)

    # ========== ENTREGA ==========
    elements.append(Paragraph("DATOS DE ENTREGA", styles['SectionHeader']))

    entrega_data = [
        [
            Paragraph("<b>Fecha Requerida:</b>", styles['FieldLabel']),
            Paragraph(format_date(data.get('fecha_requerida')), styles['FieldValue']),
        ],
        [
            Paragraph("<b>Dirección de Entrega:</b>", styles['FieldLabel']),
            Paragraph(safe_str(data.get('direccion_entrega')), styles['NormalINVEX']),
        ],
    ]

    entrega_table = Table(entrega_data, colWidths=[1.5*inch, 6*inch])
    entrega_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), INVEX_LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(entrega_table)
    elements.append(Spacer(1, 4))

    # ========== FIRMAS ==========
    firma_data = [
        [
            Paragraph("_" * 30, styles['FieldValue']),
            Paragraph("_" * 30, styles['FieldValue']),
            Paragraph("_" * 30, styles['FieldValue']),
        ],
        [
            Paragraph("<b>SOLICITANTE</b>", ParagraphStyle('center', alignment=TA_CENTER, fontSize=8)),
            Paragraph("<b>AUTORIZADOR</b>", ParagraphStyle('center', alignment=TA_CENTER, fontSize=8)),
            Paragraph("<b>Vo. Bo. COMPRAS</b>", ParagraphStyle('center', alignment=TA_CENTER, fontSize=8)),
        ],
        [
            Paragraph(safe_str(data.get('solicitante')), ParagraphStyle('center', alignment=TA_CENTER, fontSize=7, textColor=colors.gray)),
            Paragraph(safe_str(data.get('autorizador')), ParagraphStyle('center', alignment=TA_CENTER, fontSize=7, textColor=colors.gray)),
            Paragraph("", ParagraphStyle('center', alignment=TA_CENTER, fontSize=7)),
        ],
    ]

    firma_table = Table(firma_data, colWidths=[2.5*inch, 2.5*inch, 2.5*inch])
    firma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(firma_table)

    # ========== FOOTER ==========
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph(
        f"Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} - Sistema INVEX",
        styles['FooterINVEX']
    ))

    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_solicitud_from_orden(orden_data: dict, proveedor_data: dict = None, producto_data: dict = None) -> BytesIO:
    """
    Genera un PDF de solicitud/orden de compra a partir de datos de OrdenCompra

    Args:
        orden_data: Datos de la orden de compra del sistema
        proveedor_data: Datos del proveedor (opcional)
        producto_data: Datos del producto (opcional)

    Returns:
        BytesIO: Buffer con el PDF generado
    """
    # Mapear datos de orden a formato de solicitud
    pdf_data = {
        'folio': orden_data.get('id', 'N/A'),
        'fecha_solicitud': orden_data.get('fecha_orden'),
        'solicitante': orden_data.get('solicitante', 'Usuario del Sistema'),
        'area': orden_data.get('area', 'Banca Transaccional/Operaciones'),
        'correo': orden_data.get('correo', ''),
        'extension': orden_data.get('extension', ''),
        'autorizador': orden_data.get('autorizador', ''),
        'clave_presupuestal': orden_data.get('presupuesto', ''),
        'centro_costos': orden_data.get('centro_costos', ''),
        'usuario_bien': orden_data.get('usuario_bien', ''),
        'area_usuario': orden_data.get('area_usuario', 'BT Operaciones'),
        'razon_social': orden_data.get('razon_social', 'BANCO INVEX SA INSTITUCION DE BANCA MULTIPLE'),
        'area_uso': orden_data.get('area_uso', 'BT Operaciones'),
        'motivo_compra': orden_data.get('motivo_compra', orden_data.get('nombre_producto', '')),
        'es_compra_unica': orden_data.get('es_compra_unica', False),
        'es_compra_regular': orden_data.get('es_compra_regular', True),
        'descripcion': orden_data.get('nombre_producto') or (producto_data.get('nombre') if producto_data else orden_data.get('producto_id', '')),
        'cantidad': orden_data.get('cantidad', 0),
        'unidad_medida': orden_data.get('unidad_medida', 'PZA'),
        'precio_unitario': orden_data.get('costo_unitario', 0),
        'costo_total': orden_data.get('costo_total', 0),
        'fecha_requerida': orden_data.get('fecha_entrega'),
        'direccion_entrega': orden_data.get('direccion_entrega', 'TSYS MX, Toluca EDOMEX'),
        'items': [{
            'descripcion': orden_data.get('nombre_producto') or (producto_data.get('nombre') if producto_data else orden_data.get('producto_id', '')),
            'cantidad': orden_data.get('cantidad', 0),
            'unidad': orden_data.get('unidad_medida', 'PZA'),
            'precio_unitario': orden_data.get('costo_unitario', 0),
            'total': orden_data.get('costo_total', 0)
        }]
    }

    # Agregar datos del proveedor si están disponibles
    if proveedor_data:
        pdf_data['proveedor'] = proveedor_data.get('nombre', '')

    return generate_orden_compra_pdf(pdf_data)

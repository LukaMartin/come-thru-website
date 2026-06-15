import path from "node:path";
import PDFDocument from "pdfkit";
import { Resend } from "resend";
import { CONTACT_EMAIL, SUPPORT_EMAIL } from "@/lib/site";
import { formatEventDateRange } from "@/lib/tickets";

type EmailTicket = {
  code: string;
  ticketNumber: string;
  qrDataUrl: string;
  ticketName: string;
  ticketUrl: string;
};

export type TicketEmailInput = {
  to: string;
  eventName: string;
  venue: string;
  venueAddress: string;
  startsAt: string;
  endsAt?: string | null;
  orderTotalCents: number;
  orderReference: string;
  currency: string;
  tickets: EmailTicket[];
  ticketColours: string;
};

type SendContactEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const interRegularPath = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "inter",
  "files",
  "inter-latin-400-normal.woff",
);
const interBoldPath = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "inter",
  "files",
  "inter-latin-700-normal.woff",
);
const ticketLogoPath = path.join(
  process.cwd(),
  "public",
  "logo-black-stacked.png",
);
const emailLogoUrl =
  "https://xyqt8pop1o0luawg.public.blob.vercel-storage.com/COME-THRU_LANDSCAPE_BLK.png";

export async function sendTicketEmail(input: TicketEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "RESEND_API_KEY and EMAIL_FROM are required to send tickets.",
    );
  }

  const resend = new Resend(apiKey);
  const ticketsPdf = await createTicketsPdf(input);

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: `Your tickets for ${input.eventName} (Order ${input.orderReference})`,
    html: renderTicketEmail(input),
    attachments: [
      {
        filename: "tickets.pdf",
        content: ticketsPdf,
        contentType: "application/pdf",
      },
    ],
  });

  assertResendSuccess(result, "ticket email");
}

export async function sendContactEmail(input: SendContactEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send contact emails.");
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: withDisplayName(SUPPORT_EMAIL, "Come Thru Support"),
    to: CONTACT_EMAIL,
    replyTo: input.email,
    subject: `Website enquiry: ${input.subject}`,
    html: renderContactEmail(input),
    text: renderContactEmailText(input),
  });

  assertResendSuccess(result, "contact email");
}

function assertResendSuccess(
  result: unknown,
  description: "ticket email" | "contact email",
) {
  const resendResult = result as {
    error?: { message?: string; name?: string } | null;
  };

  if (resendResult.error) {
    throw new Error(
      resendResult.error.message ??
        resendResult.error.name ??
        `Failed to send ${description}.`,
    );
  }
}

export function renderTicketEmail(input: TicketEmailInput) {
  const eventDate = escapeHtml(
    formatEventDateRange(input.startsAt, input.endsAt),
  );
  const venue = escapeHtml(input.venue);

  return `
    <div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111;">
      <img src="${emailLogoUrl}" alt="Come Thru" width="520" style="width:90%;max-width:520px;height:auto;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;">
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px;text-align:center;border-bottom:1px solid #ddd;padding-bottom:20px;">
        We're looking forward to seeing you at the ${escapeHtml(input.eventName)}! Your ${input.tickets.length === 1 ? "ticket is" : "tickets are"} attached to this email in a PDF. Please have your ${input.tickets.length === 1 ? "ticket" : "tickets"} ready when you arrive on the day. Door staff will scan each QR code once at entry.
      </p>
      <p style="font-size:16px;line-height:1.5;font-weight:bold;font-family:Inter,sans-serif;margin-left:10px;margin-top:32px;">
        Event Details
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:16px;line-height:1.5;font-family:Inter,Arial,sans-serif;margin-left:10px;margin-top:16px;border-collapse:collapse;">
        ${renderEmailDetailRow(renderCalendarEmailIcon(), eventDate)}
        ${renderEmailDetailRow(renderPinEmailIcon(), venue + " - " + input.venueAddress)}
      </table>
      <div style="border-bottom:1px solid #ddd;padding-bottom:20px;"></div>
      <p style="font-size:14px;line-height:1.5;font-family:Inter,sans-serif;margin-left:10px;margin-top:32px;text-align:center;">
        If you have any questions regarding your ${input.tickets.length === 1 ? "ticket" : "tickets"}, please email ${SUPPORT_EMAIL}
      </p>
    </div>
  `;
}

function renderEmailDetailRow(icon: string, value: string) {
  return `
    <tr>
      <td style="width:24px;padding:0 8px 8px 0;vertical-align:top;color:#050505;">
        ${icon}
      </td>
      <td style="padding:0 0 8px 0;vertical-align:top;color:#050505;">
        ${value}
      </td>
    </tr>
  `;
}

function renderCalendarEmailIcon() {
  return `
    <span aria-hidden="true" style="display:block;width:18px;font-size:16px;line-height:20px;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',Arial,sans-serif;">&#128197;</span>
  `;
}

function renderPinEmailIcon() {
  return `
    <span aria-hidden="true" style="display:block;width:18px;font-size:16px;line-height:20px;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',Arial,sans-serif;">&#128205;</span>
  `;
}

function renderContactEmail(input: SendContactEmailInput) {
  const messageHtml = escapeHtml(input.message).replaceAll("\n", "<br />");

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111;">
      <p style="font-size:13px;color:#666;margin:0 0 8px;">New website enquiry</p>
      <h1 style="font-size:24px;margin:0 0 20px;">${escapeHtml(input.subject)}</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
        <strong>Name:</strong> ${escapeHtml(input.name)}<br />
        <strong>Email:</strong> ${escapeHtml(input.email)}
      </p>
      <div style="font-size:16px;line-height:1.6;border-top:1px solid #ddd;padding-top:16px;">
        ${messageHtml}
      </div>
    </div>
  `;
}

function renderContactEmailText(input: SendContactEmailInput) {
  return [
    "New website enquiry",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    "",
    input.message,
  ].join("\n");
}

function withDisplayName(from: string, displayName: string) {
  const match = from.match(/<([^>]+)>/);
  const email = match?.[1] ?? from;

  return `${displayName} <${email}>`;
}

function getTicketColours(ticketColours: string) {
  const colours = ticketColours.split(",");

  if (colours.length >= 2) {
    return {
      stop1: colours[0],
      stop2: colours[1],
      stop3: colours[2],
    };
  } else {
    return {
      stop1: "#FFF2C7",
      stop2: "#FFD6EA",
      stop3: "#CDEBFF",
    };
  }
}

export async function createTicketsPdf(input: TicketEmailInput) {
  const { stop1, stop2, stop3 } = getTicketColours(input.ticketColours);

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    info: {
      Title: `Tickets for ${input.eventName}`,
      Author: "Tickets",
    },
  });
  const chunks: Buffer[] = [];
  registerTicketFonts(doc);

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  input.tickets.forEach((ticket, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const qrBuffer = dataUrlToBuffer(ticket.qrDataUrl);
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const cardWidth = pageWidth - 72;
    const layoutCardHeight = pageHeight - 280;
    const cardX = (pageWidth - cardWidth) / 2;
    const layoutCardY = (pageHeight - layoutCardHeight) / 2;
    const qrSize = Math.min(250, layoutCardHeight - 72);
    const qrPadding = 6;
    const qrBoxSize = qrSize + qrPadding * 2;
    const qrBoxX = cardX + 12;
    const qrBoxY = layoutCardY + (layoutCardHeight - qrBoxSize) / 2;
    const dividerX = qrBoxX * 2 + qrBoxSize - cardX;
    const detailsX = dividerX + 40;
    const detailsWidth = cardX + cardWidth - detailsX - 36;
    const dateLabel = formatEventDateRange(input.startsAt, input.endsAt);
    const logoWidth = 88;
    const cardVerticalPadding = 14;
    const cardY = qrBoxY - cardVerticalPadding;
    const cardHeight = qrBoxSize + cardVerticalPadding * 2;
    const copyBgX = dividerX + 1;
    const copyBgY = cardY + 1;
    const copyBgWidth = cardX + cardWidth - copyBgX - 1;
    const copyBgHeight = cardHeight - 2;
    const notchRadius = 9;

    doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

    const copyGradient = doc.linearGradient(
      copyBgX,
      copyBgY,
      copyBgX + copyBgWidth,
      copyBgY + copyBgHeight,
    );

    copyGradient.stop(0, stop1).stop(0.48, stop2).stop(1, stop3);

    doc
      .save()
      .rect(copyBgX, copyBgY, copyBgWidth, copyBgHeight)
      .fillOpacity(0.45)
      .fill(copyGradient)
      .restore();

    doc
      .roundedRect(cardX, cardY, cardWidth, cardHeight, 0)
      .lineWidth(2)
      .strokeColor("#050505")
      .strokeOpacity(0.5)
      .stroke();

    doc.image(qrBuffer, qrBoxX + qrPadding, qrBoxY + qrPadding, {
      width: qrSize,
      height: qrSize,
    });

    doc
      .moveTo(dividerX, cardY + notchRadius)
      .lineTo(dividerX, cardY + cardHeight - notchRadius)
      .lineWidth(2.5)
      .dash(10, { space: 4 })
      .strokeColor("#000000")
      .strokeOpacity(1)
      .stroke()
      .undash();

    drawTicketNotches(doc, dividerX, cardY, cardY + cardHeight, notchRadius);

    doc
      .font("Inter-Bold")
      .fontSize(22)
      .fillColor("#050505")
      .text(input.eventName.toUpperCase(), detailsX - 12, layoutCardY + 36, {
        width: detailsWidth,
        height: 76,
        ellipsis: true,
      });

    doc
      .font("Inter-Bold")
      .fontSize(16)
      .fillColor("#050505")
      .text(ticket.ticketName.toUpperCase(), detailsX - 10, layoutCardY + 70, {
        width: detailsWidth,
        ellipsis: true,
      });

    drawCalendarIcon(doc, detailsX - 10, layoutCardY + 136, "#050505", 21);
    doc
      .font("Inter")
      .fontSize(18)
      .fillColor("#050505")
      .text(dateLabel, detailsX + 24, layoutCardY + 136, {
        width: detailsWidth - 34,
        ellipsis: true,
      });

    drawPinIcon(doc, detailsX - 10, layoutCardY + 170, "#050505", 22);
    doc
      .font("Inter")
      .fontSize(18)
      .fillColor("#050505")
      .text(
        input.venue + " - " + input.venueAddress,
        detailsX + 24,
        layoutCardY + 170,
        {
          width: detailsWidth - 34,
          ellipsis: true,
        },
      );

    doc
      .font("Inter-Bold")
      .fontSize(16)
      .fillColor("#050505")
      .text(
        "Ticket number:",
        detailsX - 7,
        layoutCardY + layoutCardHeight - 57,
        {
          continued: true,
        },
      )
      .font("Inter")
      .fillColor("#050505")
      .text(` ${ticket.ticketNumber}`);

    doc.image(
      ticketLogoPath,
      cardX + cardWidth - logoWidth - 16,
      layoutCardY + layoutCardHeight - 92,
      {
        width: logoWidth,
      },
    );
  });

  doc.end();

  return finished;
}

function registerTicketFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont("Inter", interRegularPath);
  doc.registerFont("Inter-Bold", interBoldPath);
}

function drawTicketNotches(
  doc: PDFKit.PDFDocument,
  x: number,
  topY: number,
  bottomY: number,
  radius: number,
) {
  const curve = radius * 0.5522847498;

  doc.save().fillColor("#ffffff");
  doc.circle(x, topY, radius).fill();
  doc.circle(x, bottomY, radius).fill();

  doc
    .lineWidth(2)
    .strokeColor("#050505")
    .strokeOpacity(0.5)
    .moveTo(x - radius, topY)
    .bezierCurveTo(
      x - radius,
      topY + curve,
      x - curve,
      topY + radius,
      x,
      topY + radius,
    )
    .bezierCurveTo(
      x + curve,
      topY + radius,
      x + radius,
      topY + curve,
      x + radius,
      topY,
    )
    .moveTo(x - radius, bottomY)
    .bezierCurveTo(
      x - radius,
      bottomY - curve,
      x - curve,
      bottomY - radius,
      x,
      bottomY - radius,
    )
    .bezierCurveTo(
      x + curve,
      bottomY - radius,
      x + radius,
      bottomY - curve,
      x + radius,
      bottomY,
    )
    .stroke()
    .restore();
}

function drawCalendarIcon(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  color: string,
  size = 15,
) {
  drawLucideIcon(doc, x, y - 1, size, color, () => {
    doc.roundedRect(3, 4, 18, 18, 2).stroke();
    doc.moveTo(16, 2).lineTo(16, 6).stroke();
    doc.moveTo(8, 2).lineTo(8, 6).stroke();
    doc.moveTo(3, 10).lineTo(21, 10).stroke();
  });
}

function drawPinIcon(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  color: string,
  size = 16,
) {
  drawLucideIcon(doc, x, y, size, color, () => {
    doc
      .path(
        "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      )
      .stroke();
    doc.circle(12, 10, 3).stroke();
  });
}

function drawLucideIcon(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size: number,
  color: string,
  draw: () => void,
) {
  doc.save();
  doc
    .translate(x, y)
    .scale(size / 24)
    .lineWidth(2.8)
    .lineCap("round")
    .lineJoin("round")
    .strokeColor(color)
    .strokeOpacity(1);
  draw();
  doc.restore();
}

function dataUrlToBuffer(dataUrl: string) {
  const [, base64] = dataUrl.split(",");

  if (!base64) {
    throw new Error("Invalid QR code data URL.");
  }

  return Buffer.from(base64, "base64");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

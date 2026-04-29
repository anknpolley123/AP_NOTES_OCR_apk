
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export const exportToDocx = async (title: string, text: string) => {
  // Simple markdown-ish to DOCX converter
  const lines = text.split('\n');
  const children = [];

  // Add Title
  children.push(
    new Paragraph({
      text: title || "Untitled Note",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Add Date
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Exported on ${new Date().toLocaleString()}`,
          italics: true,
          size: 20,
        }),
      ],
      spacing: { after: 600 },
    })
  );

  // Process lines
  lines.forEach(line => {
    if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({ text: line.substring(2), bullet: { level: 0 }, spacing: { after: 120 } }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ spacing: { after: 200 } }));
    } else {
      // Basic bold/italic check (very simplified)
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const textRuns = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.slice(2, -2), bold: true });
        } else if (part.startsWith('*') && part.endsWith('*')) {
          return new TextRun({ text: part.slice(1, -1), italics: true });
        }
        return new TextRun(part);
      });

      children.push(new Paragraph({ children: textRuns, spacing: { after: 200 } }));
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title || 'Note'}.docx`);
};

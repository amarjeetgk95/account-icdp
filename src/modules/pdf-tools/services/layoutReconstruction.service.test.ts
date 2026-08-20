import { describe, it, expect } from 'vitest';
import { layoutReconstructionService } from './layoutReconstruction.service';
import type { ExtractedElement } from '../types/spatial.types';

describe('LayoutReconstructionService — Paragraph-First Reconstruction', () => {
  // Test 1: Glyph and Sub-Word Stitching
  it('stitches fragmented Gujarati vector glyphs into meaningful words e.g. વિભાગ – સુરત', () => {
    // Fragments: 'વિ', 'ભા', 'ગ', '–', 'સુર', 'ત'
    const glyphFragments: ExtractedElement[] = [
      { id: 'g1', page: 1, text: 'વિ', rawText: 'વિ', x: 50, y: 100, width: 14, height: 16, bbox: [50, 100, 64, 116], source: 'pdf-text', confidence: 100, fontSize: 14 },
      { id: 'g2', page: 1, text: 'ભા', rawText: 'ભા', x: 65, y: 100, width: 14, height: 16, bbox: [65, 100, 79, 116], source: 'pdf-text', confidence: 100, fontSize: 14 },
      { id: 'g3', page: 1, text: 'ગ', rawText: 'ગ', x: 80, y: 100, width: 12, height: 16, bbox: [80, 100, 92, 116], source: 'pdf-text', confidence: 100, fontSize: 14 },
      { id: 'g4', page: 1, text: '–', rawText: '–', x: 96, y: 100, width: 10, height: 16, bbox: [96, 100, 106, 116], source: 'pdf-text', confidence: 100, fontSize: 14 },
      { id: 'g5', page: 1, text: 'સુર', rawText: 'સુર', x: 110, y: 100, width: 22, height: 16, bbox: [110, 100, 132, 116], source: 'pdf-text', confidence: 100, fontSize: 14 },
      { id: 'g6', page: 1, text: 'ત', rawText: 'ત', x: 133, y: 100, width: 12, height: 16, bbox: [133, 100, 145, 116], source: 'pdf-text', confidence: 100, fontSize: 14 },
    ];

    const words = layoutReconstructionService.reconstructGlyphsAndWords(glyphFragments);
    const combinedLine = words.map((w) => w.text).join(' ');

    expect(combinedLine).toContain('વિભાગ – સુરત');
    expect(words[0].bbox[0]).toBe(50);
  });

  // Test 2: Paragraph-First Rule: Normal Prose remains Paragraph, NOT Table Cells
  it('Paragraph-First Rule: Normal introductory prose and references remain paragraphs, not artificial table cells', () => {
    const elements: ExtractedElement[] = [
      // Title
      { id: 't1', page: 1, text: 'ગુજરાત સરકાર - પશુપાલન વિભાગ', rawText: 'ગુજરાત સરકાર - પશુપાલન વિભાગ', x: 200, y: 40, width: 400, height: 20, bbox: [200, 40, 600, 60], source: 'pdf-text', confidence: 100, fontSize: 18, isBold: true },
      // Reference lines
      { id: 'r1', page: 1, text: 'સંદર્ભ: (૧) કચેરી આદેશ ક્રમાંક ૧૨/૨૦૨૬', rawText: 'સંદર્ભ: (૧) કચેરી આદેશ ક્રમાંક ૧૨/૨૦૨૬', x: 60, y: 80, width: 320, height: 14, bbox: [60, 80, 380, 94], source: 'pdf-text', confidence: 100, fontSize: 12 },
      { id: 'r2', page: 1, text: '(૨) સરકારશ્રીનો પત્ર ક્રમાંક ૪૫/૨૦૨૬', rawText: '(૨) સરકારશ્રીનો પત્ર ક્રમાંક ૪૫/૨૦૨૬', x: 60, y: 100, width: 300, height: 14, bbox: [60, 100, 360, 114], source: 'pdf-text', confidence: 100, fontSize: 12 },
      // Continuous explanatory prose
      { id: 'p1', page: 1, text: 'ઉપરોક્ત વિષય અને સંદર્ભ અન્વયે જણાવવાનું કે સઘન પશુ સુધારણા યોજના સુરત ખાતે', rawText: 'ઉપરોક્ત વિષય અને સંદર્ભ અન્વયે જણાવવાનું કે સઘન પશુ સુધારણા યોજના સુરત ખાતે', x: 60, y: 130, width: 680, height: 14, bbox: [60, 130, 740, 144], source: 'pdf-text', confidence: 100, fontSize: 12 },
      { id: 'p2', page: 1, text: 'ટેન્ડર પ્રક્રિયા પૂર્ણ કરવામાં આવેલ છે. જેની વિગતવાર માહિતી નીચે મુજબ છે.', rawText: 'ટેન્ડર પ્રક્રિયા પૂર્ણ કરવામાં આવેલ છે. જેની વિગતવાર માહિતી નીચે મુજબ છે.', x: 60, y: 150, width: 650, height: 14, bbox: [60, 150, 710, 164], source: 'pdf-text', confidence: 100, fontSize: 12 },
    ];

    const result = layoutReconstructionService.reconstructPageLayout(elements, 1, 800, 600);

    // ZERO artificial tables should be generated for pure prose!
    expect(result.tables.length).toBe(0);
    // Paragraphs should contain the title, references, and merged prose paragraph
    expect(result.paragraphs.length).toBeGreaterThanOrEqual(3);

    const titlePara = result.paragraphs.find((p) => p.isHeading || p.blockType === 'heading');
    expect(titlePara).toBeDefined();
    expect(titlePara?.text).toContain('ગુજરાત સરકાર');

    const prosePara = result.paragraphs.find((p) => p.text.includes('ઉપરોક્ત વિષય'));
    expect(prosePara).toBeDefined();
    expect(prosePara?.text).toContain('ટેન્ડર પ્રક્રિયા પૂર્ણ કરવામાં આવેલ છે');
  });

  // Test 3: Genuine Table Detection with 5 Structural Indicators
  it('detects genuine multi-column tables satisfying the 5 structural indicators (e.g. Bidder Table)', () => {
    const elements: ExtractedElement[] = [
      // Table Header Row
      { id: 'h1', page: 1, text: 'અનુક્રમ', rawText: 'અનુક્રમ', x: 50, y: 100, width: 60, height: 16, bbox: [50, 100, 110, 116], source: 'pdf-text', confidence: 100 },
      { id: 'h2', page: 1, text: 'ઇવેલ્યુએશન નં.', rawText: 'ઇવેલ્યુએશન નં.', x: 150, y: 100, width: 100, height: 16, bbox: [150, 100, 250, 116], source: 'pdf-text', confidence: 100 },
      { id: 'h3', page: 1, text: 'પાર્ટીનું નામ', rawText: 'પાર્ટીનું નામ', x: 300, y: 100, width: 120, height: 16, bbox: [300, 100, 420, 116], source: 'pdf-text', confidence: 100 },
      { id: 'h4', page: 1, text: 'સ્થિતિ', rawText: 'સ્થિતિ', x: 500, y: 100, width: 80, height: 16, bbox: [500, 100, 580, 116], source: 'pdf-text', confidence: 100 },

      // Row 1
      { id: 'r1_1', page: 1, text: '૧', rawText: '૧', x: 50, y: 130, width: 20, height: 14, bbox: [50, 130, 70, 144], source: 'pdf-text', confidence: 100 },
      { id: 'r1_2', page: 1, text: 'TE-001', rawText: 'TE-001', x: 150, y: 130, width: 70, height: 14, bbox: [150, 130, 220, 144], source: 'pdf-text', confidence: 100 },
      { id: 'r1_3', page: 1, text: 'મેસર્સ પટેલ એન્ટરપ્રાઈઝ', rawText: 'મેસર્સ પટેલ એન્ટરપ્રાઈઝ', x: 300, y: 130, width: 140, height: 14, bbox: [300, 130, 440, 144], source: 'pdf-text', confidence: 100 },
      { id: 'r1_4', page: 1, text: 'માન્ય', rawText: 'માન્ય', x: 500, y: 130, width: 40, height: 14, bbox: [500, 130, 540, 144], source: 'pdf-text', confidence: 100 },

      // Row 2
      { id: 'r2_1', page: 1, text: '૨', rawText: '૨', x: 50, y: 160, width: 20, height: 14, bbox: [50, 160, 70, 174], source: 'pdf-text', confidence: 100 },
      { id: 'r2_2', page: 1, text: 'TE-002', rawText: 'TE-002', x: 150, y: 160, width: 70, height: 14, bbox: [150, 160, 220, 174], source: 'pdf-text', confidence: 100 },
      { id: 'r2_3', page: 1, text: 'મેસર્સ શર્મા ટ્રેડર્સ', rawText: 'મેસર્સ શર્મા ટ્રેડર્સ', x: 300, y: 160, width: 120, height: 14, bbox: [300, 160, 420, 174], source: 'pdf-text', confidence: 100 },
      { id: 'r2_4', page: 1, text: 'અમાન્ય', rawText: 'અમાન્ય', x: 500, y: 160, width: 50, height: 14, bbox: [500, 160, 550, 174], source: 'pdf-text', confidence: 100 },
    ];

    const result = layoutReconstructionService.reconstructPageLayout(elements, 1, 800, 600);

    expect(result.tables.length).toBe(1);
    const table = result.tables[0];
    expect(table.columnCount).toBe(4);
    expect(table.rowCount).toBe(3);
    expect(table.rows[0].isHeader).toBe(true);
    expect(table.rows[1].cells[2].text).toBe('મેસર્સ પટેલ એન્ટરપ્રાઈઝ');
  });

  // Test 4: Complete Document Structure with Interleaved Prose, Tables, and Signature Blocks
  it('correctly separates introductory prose, bidder table, committee table, and signature blocks in natural reading flow', () => {
    const elements: ExtractedElement[] = [
      // 1. Heading
      { id: 'e1', page: 1, text: 'બિડ ઓપનિંગ રોજકામ', rawText: 'બિડ ઓપનિંગ રોજકામ', x: 250, y: 40, width: 300, height: 20, bbox: [250, 40, 550, 60], source: 'pdf-text', confidence: 100, isBold: true, fontSize: 18 },

      // 2. Introductory prose
      { id: 'e2', page: 1, text: 'આજ રોજ તારીખ ૧૯/૦૮/૨૦૨૬ ના રોજ નીચે સહી કરનાર સમિતિના સભ્યો સમક્ષ બિડ ખોલવામાં આવી.', rawText: 'આજ રોજ તારીખ ૧૯/૦૮/૨૦૨૬ ના રોજ નીચે સહી કરનાર સમિતિના સભ્યો સમક્ષ બિડ ખોલવામાં આવી.', x: 50, y: 80, width: 700, height: 14, bbox: [50, 80, 750, 94], source: 'pdf-text', confidence: 100, fontSize: 12 },

      // 3. Table 1: Bidder Table
      { id: 't1_h1', page: 1, text: 'ક્રમ', rawText: 'ક્રમ', x: 50, y: 120, width: 40, height: 14, bbox: [50, 120, 90, 134], source: 'pdf-text', confidence: 100 },
      { id: 't1_h2', page: 1, text: 'પાર્ટીનું નામ', rawText: 'પાર્ટીનું નામ', x: 200, y: 120, width: 100, height: 14, bbox: [200, 120, 300, 134], source: 'pdf-text', confidence: 100 },
      { id: 't1_r1_1', page: 1, text: '૧', rawText: '૧', x: 50, y: 145, width: 20, height: 14, bbox: [50, 145, 70, 159], source: 'pdf-text', confidence: 100 },
      { id: 't1_r1_2', page: 1, text: 'મેસર્સ ગુજરાત સપ્લાયર્સ', rawText: 'મેસર્સ ગુજરાત સપ્લાયર્સ', x: 200, y: 145, width: 140, height: 14, bbox: [200, 145, 340, 159], source: 'pdf-text', confidence: 100 },

      // 4. Middle narrative prose
      { id: 'e3', page: 1, text: 'સમિતિ દ્વારા તમામ કાગળોની ચકાસણી કરવામાં આવેલ છે અને સર્વાનુમતે નિર્ણય લેવામાં આવ્યો.', rawText: 'સમિતિ દ્વારા તમામ કાગળોની ચકાસણી કરવામાં આવેલ છે અને સર્વાનુમતે નિર્ણય લેવામાં આવ્યો.', x: 50, y: 180, width: 700, height: 14, bbox: [50, 180, 750, 194], source: 'pdf-text', confidence: 100, fontSize: 12 },

      // 5. Table 2: Committee Members Table
      { id: 't2_h1', page: 1, text: 'અ.નં.', rawText: 'અ.નં.', x: 50, y: 220, width: 40, height: 14, bbox: [50, 220, 90, 234], source: 'pdf-text', confidence: 100 },
      { id: 't2_h2', page: 1, text: 'સભ્યશ્રીનું નામ', rawText: 'સભ્યશ્રીનું નામ', x: 150, y: 220, width: 100, height: 14, bbox: [150, 220, 250, 234], source: 'pdf-text', confidence: 100 },
      { id: 't2_h3', page: 1, text: 'હોદ્દો', rawText: 'હોદ્દો', x: 350, y: 220, width: 80, height: 14, bbox: [350, 220, 430, 234], source: 'pdf-text', confidence: 100 },

      { id: 't2_r1_1', page: 1, text: '૧', rawText: '૧', x: 50, y: 245, width: 20, height: 14, bbox: [50, 245, 70, 259], source: 'pdf-text', confidence: 100 },
      { id: 't2_r1_2', page: 1, text: 'શ્રી એ. કે. રાઠોડ', rawText: 'શ્રી એ. કે. રાઠોડ', x: 150, y: 245, width: 120, height: 14, bbox: [150, 245, 270, 259], source: 'pdf-text', confidence: 100 },
      { id: 't2_r1_3', page: 1, text: 'સહાયક નિયામક (ચેરમેન)', rawText: 'સહાયક નિયામક (ચેરમેન)', x: 350, y: 245, width: 140, height: 14, bbox: [350, 245, 490, 259], source: 'pdf-text', confidence: 100 },

      // 6. Right-aligned Signature Block
      { id: 's1', page: 1, text: 'સહાયક નિયામકશ્રી, સઘન પશુ સુધારણા યોજના, સુરત', rawText: 'સહાયક નિયામકશ્રી, સઘન પશુ સુધારણા યોજના, સુરત', x: 420, y: 300, width: 340, height: 16, bbox: [420, 300, 760, 316], source: 'pdf-text', confidence: 100, fontSize: 12 },
    ];

    const result = layoutReconstructionService.reconstructPageLayout(elements, 1, 800, 600);

    // Verify exactly 2 discrete genuine tables are detected
    expect(result.tables.length).toBe(2);

    // Verify paragraphs retain the intro prose, middle narrative, and signature
    expect(result.paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(result.paragraphs.some((p) => p.text.includes('બિડ ઓપનિંગ રોજકામ'))).toBe(true);
    expect(result.paragraphs.some((p) => p.text.includes('સમિતિ દ્વારા તમામ કાગળોની ચકાસણી'))).toBe(true);

    const sig = result.paragraphs.find((p) => p.blockType === 'signature' || p.text.includes('સહાયક નિયામકશ્રી'));
    expect(sig).toBeDefined();

    // Verify reading order blocks interleave paragraphs and tables sequentially
    expect(result.blocks.length).toBeGreaterThanOrEqual(5);
    expect(result.blocks[0].type).toBe('heading');
    expect(result.blocks[1].type).toBe('paragraph');
    expect(result.blocks[2].type).toBe('table');
    expect(result.blocks[3].type).toBe('paragraph');
    expect(result.blocks[4].type).toBe('table');
  });
});

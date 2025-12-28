import { questionsData } from '../data/questions';

export interface Question {
    id: string;
    prova: string;
    materia: string;
    questao: string;
    enunciado: string;
    alternativaA: string;
    alternativaB: string;
    alternativaC: string;
    alternativaD: string;
    gabarito: string;
    fonte: string;
}

export const parseQuestions = (): Question[] => {
    if (!questionsData) return [];

    // Simple CSV parser tailored for the specific format
    // Note: A robust parser like papaparse is better, but this works for the embedded string without external deps if needed.
    // However, since we have complex quoted strings with newlines, we need a smarter split.

    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < questionsData.length; i++) {
        const char = questionsData[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }

        if (char === '\n' && !inQuotes) {
            lines.push(currentLine);
            currentLine = '';
        } else {
            currentLine += char;
        }
    }
    if (currentLine) lines.push(currentLine);

    // Skip header
    const dataLines = lines.slice(1);

    return dataLines.map(line => {
        const columns: string[] = [];
        let currentVal = '';
        let inQ = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    currentVal += '"';
                    i++; // skip escaped quote
                } else {
                    inQ = !inQ;
                }
            } else if (char === ',' && !inQ) {
                columns.push(currentVal);
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        columns.push(currentVal);

        return {
            id: columns[0],
            prova: columns[1],
            materia: columns[2],
            questao: columns[3],
            enunciado: columns[4]?.replace(/^"|"$/g, '').replace(/""/g, '"'), // Cleanup quotes
            alternativaA: columns[5],
            alternativaB: columns[6],
            alternativaC: columns[7],
            alternativaD: columns[8],
            gabarito: columns[9],
            fonte: columns[10]
        };
    }).filter(q => q.id); // Filter empty lines
};

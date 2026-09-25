import React from 'react';
import { TableData, Question } from '../../types';
import { Table as TableIcon } from 'lucide-react';

interface IELTSTableCompletionProps {
  tableData?: TableData;
  question: Question;
  questionNumber: number;
  userAnswer: string;
  onAnswerChange: (questionId: string, answer: string) => void;
  // If multiple questions share this table:
  allUserAnswers?: Record<string, string>;
}

export const IELTSTableCompletion: React.FC<IELTSTableCompletionProps> = ({
  tableData,
  question,
  questionNumber,
  userAnswer,
  onAnswerChange,
  allUserAnswers = {}
}) => {
  // If structured tableData exists
  if (tableData && tableData.headers && tableData.headers.length > 0) {
    return (
      <div className="my-3 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
        {tableData.title && (
          <div className="bg-[#503A7A] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-purple-200" />
            <span>{tableData.title}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-purple-100/80 border-b border-purple-200">
                {tableData.headers.map((h, i) => (
                  <th key={i} className="p-3 font-extrabold text-[#3C2A63] border-r border-purple-200 last:border-r-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100">
              {tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8FD]'}>
                  {row.cells.map((cell, cIdx) => {
                    const isTargetBlank = cell.is_blank;
                    const cellQId = cell.question_id || question.question_id;
                    const currentVal = allUserAnswers[cellQId] ?? (cellQId === question.question_id ? userAnswer : '');

                    return (
                      <td key={cIdx} className="p-3 align-top border-r border-purple-100 last:border-r-0 font-medium text-[#3C2A63]">
                        {isTargetBlank ? (
                          <div className="space-y-1">
                            {cell.text && <div className="text-xs text-[#503A7A] mb-1 font-normal">{cell.text}</div>}
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-[#6B51A5] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                {cell.question_id ? cell.question_id.replace(/\D/g, '') || questionNumber : questionNumber}
                              </span>
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => onAnswerChange(cellQId, e.target.value)}
                                placeholder={cell.placeholder || "Enter answer..."}
                                className="w-full px-2.5 py-1.5 bg-[#F8F6FC] border border-purple-200 rounded-lg text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] focus:bg-white transition"
                              />
                            </div>
                          </div>
                        ) : (
                          <span>{cell.text || '-'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback: If table is written inside question_text as markdown or HTML
  const rawText = question.question_text || '';
  if (rawText.includes('|') && rawText.includes('\n')) {
    const lines = rawText.split('\n').filter(l => l.trim().startsWith('|'));
    if (lines.length >= 2) {
      const headerLine = lines[0];
      const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);
      const dataLines = lines.slice(1).filter(l => !l.includes('---'));

      return (
        <div className="my-3 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-100/80 border-b border-purple-200">
                  {headers.map((h, i) => (
                    <th key={i} className="p-3 font-extrabold text-[#3C2A63] border-r border-purple-200 last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {dataLines.map((line, rIdx) => {
                  const cells = line.split('|').map(s => s.trim()).filter(Boolean);
                  return (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8FD]'}>
                      {cells.map((cellText, cIdx) => {
                        const hasBlank = /_{3,}|\.{3,}|\[\.+\]|\[\s*blank\s*\]/i.test(cellText);
                        return (
                          <td key={cIdx} className="p-3 align-top border-r border-purple-100 last:border-r-0 font-medium text-[#3C2A63]">
                            {hasBlank ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-[#6B51A5] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                  {questionNumber}
                                </span>
                                <input
                                  type="text"
                                  value={userAnswer || ''}
                                  onChange={(e) => onAnswerChange(question.question_id, e.target.value)}
                                  placeholder="Type answer..."
                                  className="w-full px-2.5 py-1.5 bg-[#F8F6FC] border border-purple-200 rounded-lg text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5] focus:bg-white"
                                />
                              </div>
                            ) : (
                              <span>{cellText}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  }

  // Default standard Table Box with input
  return (
    <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
      <div className="flex items-center gap-2 text-xs font-extrabold text-[#503A7A]">
        <TableIcon className="w-4 h-4 text-[#6B51A5]" />
        <span>Table Completion: Enter word(s) to complete the table row</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-[#503A7A] text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
          {questionNumber}
        </span>
        <input
          type="text"
          value={userAnswer || ''}
          onChange={(e) => onAnswerChange(question.question_id, e.target.value)}
          placeholder="Type table completion answer..."
          className="flex-1 px-3.5 py-2 bg-white rounded-xl border border-purple-200 text-xs font-bold text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
        />
      </div>
    </div>
  );
};

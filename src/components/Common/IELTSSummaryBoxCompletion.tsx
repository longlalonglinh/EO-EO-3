import React, { useState } from 'react';
import { WordBankItem, Question, MatchingOption } from '../../types';
import { Package, GripVertical, ChevronDown, Check } from 'lucide-react';

interface IELTSSummaryBoxCompletionProps {
  question: Question;
  questionNumber: number;
  userAnswer: string;
  onAnswerChange: (questionId: string, answer: string) => void;
  wordBank?: WordBankItem[];
}

export const IELTSSummaryBoxCompletion: React.FC<IELTSSummaryBoxCompletionProps> = ({
  question,
  questionNumber,
  userAnswer,
  onAnswerChange,
  wordBank
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Normalize available words from word_bank, matching_options, or options
  const items: { id: string; text: string }[] = [];
  if (wordBank && wordBank.length > 0) {
    wordBank.forEach(wb => items.push({ id: wb.id, text: wb.word }));
  } else if (question.word_bank && question.word_bank.length > 0) {
    question.word_bank.forEach(wb => items.push({ id: wb.id, text: wb.word }));
  } else if (question.matching_options && question.matching_options.length > 0) {
    question.matching_options.forEach(m => items.push({ id: m.id, text: m.text }));
  } else if (question.options && question.options.length > 0) {
    question.options.forEach((opt, idx) => {
      const match = opt.match(/^([A-Za-z])[\.\:\s](.*)$/);
      if (match) {
        items.push({ id: match[1].toUpperCase(), text: match[2].trim() });
      } else {
        const letter = String.fromCharCode(65 + idx);
        items.push({ id: letter, text: opt });
      }
    });
  }

  // Find currently selected item label
  const selectedItem = items.find(
    i => i.id.toUpperCase() === userAnswer.trim().toUpperCase() || 
         i.text.toLowerCase() === userAnswer.trim().toLowerCase()
  );

  return (
    <div className="space-y-4 my-2">
      {/* 1. Word Bank Display Box */}
      {items.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 shadow-xs">
          <div className="text-xs font-black uppercase tracking-wider text-[#503A7A] mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#6B51A5]" />
              <span>List of Words / Phrases (A–{String.fromCharCode(64 + items.length)})</span>
            </span>
            <span className="text-[10px] text-[#7C68A5] font-semibold">
              Click or drag into blank
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((it) => {
              const isSelected = selectedItem?.id === it.id;
              return (
                <div
                  key={it.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', it.id);
                    setDraggedItem(it.id);
                  }}
                  onClick={() => onAnswerChange(question.question_id, it.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition select-none flex items-start gap-2 ${
                    isSelected
                      ? 'bg-[#6B51A5] text-white border-[#6B51A5] shadow-sm scale-102 font-bold'
                      : 'bg-white text-[#3C2A63] border-purple-100 hover:border-purple-300 hover:shadow-xs'
                  }`}
                >
                  <span className={`font-mono font-black shrink-0 ${isSelected ? 'text-white' : 'text-[#6B51A5]'}`}>
                    {it.id}.
                  </span>
                  <span className="leading-tight flex-1 break-words">{it.text}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Interactive Selection Input & Dropdown */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#7C68A5]">
          Select word or letter from the box:
        </label>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Dropdown Selector */}
          {items.length > 0 && (
            <div className="relative flex-1 min-w-[200px]">
              <select
                value={selectedItem ? selectedItem.id : (userAnswer || '')}
                onChange={(e) => onAnswerChange(question.question_id, e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-[#3C2A63] appearance-none focus:outline-none focus:ring-2 focus:ring-[#6B51A5] cursor-pointer"
              >
                <option value="">-- Choose from word list --</option>
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.id}. {it.text}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B51A5]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Quick Letter Bubble Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {items.map(it => {
              const isSelected = selectedItem?.id === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onAnswerChange(question.question_id, it.id)}
                  title={it.text}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-black transition cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#6B51A5] text-white shadow-xs scale-105'
                      : 'bg-white border border-purple-200 text-[#3C2A63] hover:bg-purple-50'
                  }`}
                >
                  {it.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected preview pill */}
        {selectedItem && (
          <div className="text-xs text-[#503A7A] flex items-center gap-1.5 pt-1">
            <span className="font-extrabold text-[#7C68A5]">Selected:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 text-[#6B51A5] font-black">
              {selectedItem.id} — {selectedItem.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

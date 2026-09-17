import React, { useState } from 'react';
import { AnimationType, Caption } from '../../types';
import { ANIMATIONS } from '../../lib/animations';
import { Sparkles, Check, PlayCircle } from 'lucide-react';

interface AnimateTabProps {
  selectedCaption: Caption | null;
  onApplyAnimation: (animation: AnimationType, scope: 'selected' | 'current' | 'all') => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const AnimateTab: React.FC<AnimateTabProps> = ({
  selectedCaption,
  onApplyAnimation,
  onToast,
}) => {
  const [scope, setScope] = useState<'selected' | 'all'>('all');
  const [previewingAnim, setPreviewingAnim] = useState<AnimationType | null>(null);

  const currentAnimation = selectedCaption?.animation || 'pop';

  return (
    <div className="p-4 flex flex-col gap-5 text-xs text-[#CBD5E1] overflow-y-auto select-none">
      {/* Scope Selector */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-[#161B22] border border-[#252B33]">
        <span className="text-[11px] font-semibold text-white">Apply Animation to:</span>
        <div className="flex items-center rounded-md bg-[#1F2630] p-0.5 border border-[#252B33]">
          <button
            onClick={() => setScope('selected')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              scope === 'selected' ? 'bg-[#F5B82E] text-[#0B0D10] font-bold' : 'text-[#8D96A3] hover:text-white'
            }`}
          >
            Selected Only
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              scope === 'all' ? 'bg-[#F5B82E] text-[#0B0D10] font-bold' : 'text-[#8D96A3] hover:text-white'
            }`}
          >
            All Captions
          </button>
        </div>
      </div>

      {/* 16 Animations Grid */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span>16 Caption Entrance & Motion Animations</span>
          </span>
          <span className="text-[10px] text-[#8D96A3]">Pure Browser RAF</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ANIMATIONS.map((anim) => {
            const isCurrent = currentAnimation === anim.id;

            return (
              <button
                key={anim.id}
                onClick={() => {
                  onApplyAnimation(anim.id, scope);
                  onToast('success', `Applied ${anim.name} animation to ${scope === 'all' ? 'all captions' : 'selected caption'}.`);
                }}
                onMouseEnter={() => setPreviewingAnim(anim.id)}
                onMouseLeave={() => setPreviewingAnim(null)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                  isCurrent
                    ? 'bg-[#1E2631] border-[#F5B82E] ring-1 ring-[#F5B82E] shadow-md shadow-[#F5B82E]/15'
                    : 'bg-[#161B22] border-[#252B33] hover:border-[#384352] hover:bg-[#1A212B]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-white text-xs group-hover:text-[#F5B82E] transition-colors">
                    {anim.name}
                  </span>
                  {isCurrent ? (
                    <Check className="w-3.5 h-3.5 text-[#F5B82E]" />
                  ) : (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1F2630] text-[#8D96A3]">
                      {anim.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#8D96A3] leading-relaxed line-clamp-2 my-1">
                  {anim.description}
                </p>

                <div className="flex items-center gap-1 text-[10px] text-[#F5B82E] font-semibold mt-1">
                  <PlayCircle className="w-3 h-3" />
                  <span>Click to Apply</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

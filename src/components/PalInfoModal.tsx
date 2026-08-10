import { useEffect, useState } from "preact/hooks";
import { XMarkIcon } from "./icons";
import type { SnapshotPartnerSkill } from "../lib/data";

type Strings = {
  openDetails: string;
  close: string;
  partnerSkill: string;
  buildRole: string;
  buildNotes: string;
  recommendedSkills: string;
  recommendedPassives: string;
  specialNote: string;
  eyebrow: string;
};

type Props = {
  name: string;
  iconUrl: string | null;
  elements: string[];
  roleLabels: string[];
  explanation: string;
  partnerSkill: SnapshotPartnerSkill | null;
  recommendedSkills: string[];
  recommendedPassives: string[];
  specialNote?: string;
  contextLabel?: string;
  slotNumber?: string;
  strings: Strings;
};

function cleanWikiText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\[\[File:[^\]]+\]\]/gi, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function PalInfoModal({
  name,
  iconUrl,
  elements,
  roleLabels,
  explanation,
  partnerSkill,
  recommendedSkills,
  recommendedPassives,
  specialNote,
  contextLabel,
  slotNumber,
  strings,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const partnerDescription = partnerSkill ? cleanWikiText(partnerSkill.description) : "";

  return (
    <>
      <button type="button" class="pal-card-button" onClick={() => setOpen(true)} aria-label={`${strings.openDetails}: ${name}`}>
        <span class="pal-card-head">
          {slotNumber && <span class="detail-number">{slotNumber}</span>}
          {iconUrl ? <img src={iconUrl} alt="" class="size-11 rounded-full object-cover" /> : <span class="grid size-11 place-items-center rounded-full bg-[var(--paper-deep)] font-display font-bold text-[var(--ink-soft)]">{name.charAt(0)}</span>}
          <span class="pal-trigger-copy">
            <strong>{name}</strong>
            <span>{strings.openDetails}</span>
          </span>
          {contextLabel && <span class="pal-context-label">{contextLabel}</span>}
        </span>
        {roleLabels.length > 0 && <span class="pal-card-roles">{roleLabels.map((role) => <span>{role}</span>)}</span>}
        <span class="pal-card-note">{explanation}</span>
      </button>

      {open && (
        <div class="pal-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section class="pal-modal" role="dialog" aria-modal="true" aria-labelledby={`pal-title-${name}`} onClick={(event) => event.stopPropagation()}>
            <button type="button" class="pal-modal-close" onClick={() => setOpen(false)} aria-label={strings.close}><XMarkIcon class="size-5" /></button>
            <div class="pal-modal-header">
              {iconUrl ? <img src={iconUrl} alt="" class="size-20 rounded-full object-cover" /> : <span class="grid size-20 place-items-center rounded-full bg-[var(--paper-deep)] font-display text-2xl font-bold text-[var(--ink-soft)]">{name.charAt(0)}</span>}
              <div>
                <p class="eyebrow">{strings.eyebrow}</p>
                <h2 id={`pal-title-${name}`}>{name}</h2>
                <div class="pal-modal-tags">{elements.map((element) => <span>{element}</span>)}</div>
              </div>
            </div>

            <div class="pal-modal-body">
              {partnerSkill && (
                <div class="pal-info-block pal-info-featured">
                  <p class="pal-info-label">{strings.partnerSkill}</p>
                  <h3>{partnerSkill.name}</h3>
                  <p>{partnerDescription}</p>
                </div>
              )}
              {roleLabels.length > 0 && <div class="pal-info-block">
                <p class="pal-info-label">{strings.buildRole}</p>
                <div class="pal-modal-tags">{roleLabels.map((role) => <span>{role}</span>)}</div>
              </div>}
              <div class="pal-info-block">
                <p class="pal-info-label">{strings.buildNotes}</p>
                <p>{explanation}</p>
              </div>
              {specialNote && <div class="pal-info-block"><p class="pal-info-label">{strings.specialNote}</p><p>{specialNote}</p></div>}
              {recommendedSkills.length > 0 && <div class="pal-info-block"><p class="pal-info-label">{strings.recommendedSkills}</p><ul>{recommendedSkills.map((skill) => <li>{skill}</li>)}</ul></div>}
              {recommendedPassives.length > 0 && <div class="pal-info-block"><p class="pal-info-label">{strings.recommendedPassives}</p><ul>{recommendedPassives.map((passive) => <li>{passive}</li>)}</ul></div>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

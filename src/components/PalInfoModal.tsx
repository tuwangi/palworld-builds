import { useEffect, useState } from "preact/hooks";
import { XMarkIcon } from "./icons";
import type { LocalizedPartnerSkill } from "../lib/partnerSkillLocalization";

/** Condensation is capped at four stars; rank 0 is an uncondensed Pal. */
const RANK_LABELS = ["☆", "★", "★★", "★★★", "★★★★"];

type Strings = {
  openDetails: string;
  close: string;
  partnerSkill: string;
  partnerSkillMissing: string;
  scalingTitle: string;
  scalingEffect: string;
  scalingNote: string;
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
  elementLabels: string[];
  roleLabels: string[];
  explanation: string;
  /**
   * Already localized upstream in data.ts — this island never sees the
   * English source or the translation tables, so neither ships to the client.
   */
  partnerSkill: LocalizedPartnerSkill | null;
  recommendedSkills: string[];
  recommendedPassives: string[];
  specialNote?: string;
  contextLabel?: string;
  slotNumber?: string;
  strings: Strings;
};

export default function PalInfoModal({
  name,
  iconUrl,
  elementLabels,
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

  return (
    <>
      <button type="button" class="pal-card-button" onClick={() => setOpen(true)} aria-label={`${strings.openDetails}: ${name}`}>
        <span class="pal-card-head">
          {slotNumber && <span class="detail-number">{slotNumber}</span>}
          {iconUrl ? <img src={iconUrl} alt="" class="pal-card-avatar size-11 rounded-full object-cover" /> : <span class="pal-card-avatar grid size-11 place-items-center rounded-full bg-[var(--paper-deep)] font-display font-bold text-[var(--ink-soft)]">{name.charAt(0)}</span>}
          <span class="pal-card-content">
            <span class="pal-card-title-row">
              <span class="pal-trigger-copy">
                <strong>{name}</strong>
                <span>{strings.openDetails}</span>
              </span>
              {roleLabels.length > 0 && <span class="pal-card-roles">{roleLabels.map((role) => <span>{role}</span>)}</span>}
            </span>
          </span>
        </span>
        <span class="pal-card-elements">{elementLabels.map((element) => <span>{element}</span>)}</span>
        {contextLabel && <span class="pal-context-label">{contextLabel}</span>}
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
                <div class="pal-modal-tags">{elementLabels.map((element) => <span>{element}</span>)}</div>
              </div>
            </div>

            <div class="pal-modal-body">
              <div class="pal-info-block pal-info-featured">
                <p class="pal-info-label">{strings.partnerSkill}</p>
                {partnerSkill ? (
                  <>
                    {/* wiki.gg publishes Elgrove's description with an empty
                        skill name; render the prose rather than an empty heading. */}
                    {partnerSkill.name && <h3>{partnerSkill.name}</h3>}
                    <p>{partnerSkill.description}</p>
                    {partnerSkill.scaling.length > 0 && (
                      <div class="pal-scaling">
                        <p class="pal-scaling-title">{strings.scalingTitle}</p>
                        <table>
                          <thead>
                            <tr>
                              <th scope="col"><span class="sr-only">{strings.scalingEffect}</span></th>
                              {RANK_LABELS.map((label) => (
                                <th scope="col" key={label}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {partnerSkill.scaling.map((row) => (
                              <tr key={`${row.effectType}-${row.target}`}>
                                <th scope="row">
                                  {row.effectType}
                                  {row.target && <span>{row.target}</span>}
                                </th>
                                {row.values.map((value, rank) => (
                                  <td key={rank} class={rank === row.values.length - 1 ? "is-max" : undefined}>
                                    {value || "—"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p class="pal-scaling-note">{strings.scalingNote}</p>
                      </div>
                    )}
                  </>
                ) : (
                  /* 17 Pals used by builds are paldb.gg-only 1.0 variants with
                     no wiki.gg partner-skill row. Say so instead of rendering
                     an empty card that reads as "this Pal has no skill". */
                  <p class="pal-info-empty">{strings.partnerSkillMissing}</p>
                )}
              </div>
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

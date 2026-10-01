import type { Job } from '../types';
import { t } from '../i18n';
export function MatchDetails({ job, onClose, onApply }: { job: Job; onClose: () => void; onApply: () => void }) {
  const canApply = job.match_score > 60;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button className="modal-close" onClick={onClose} aria-label={t('jobs.close')}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      <div className="form-eyebrow">{t('jobs.roleDetails')}</div>
      <h2 id="detail-title">{job.title}</h2>
      <p className="detail-meta">{job.category} · {job.experience} · {job.employment_type}</p>
      <div className="detail-score"><strong>{job.match_score}%</strong>
        <p>
            {job.match_score > 80 ? t('jobs.strongMatch') : job.match_score > 60 ?
            t('jobs.goodMatch') : t('jobs.lowMatch')}
        </p>
      </div>
      <div className="score-breakdown">
        <div>
          <strong>{job.skill_match}%</strong>
          <small>{t('jobs.skillMatch')}</small>
        </div>
        <div>
          <strong>{job.experience_match}%</strong>
          <small>{t('jobs.experienceMatch')}</small>
        </div>
        <div>
          <strong>{job.technology_match}%</strong>
          <small>{t('jobs.technologyMatch')}</small>
        </div>
      </div>
      <h3>{t('jobs.skillsMatch')}</h3>
      <div className="job-skills">{job.matched_skills.map((skill) =>
        <span className="skill-tag matched" key={skill}><i className="fa-solid fa-check" aria-hidden="true" /> {skill}
        </span>)}
      </div>
      <h3>{t('jobs.skillsGrow')}</h3><div className="job-skills">{job.missing_skills.map((skill) =>
        <span className="skill-tag" key={skill}>{skill}</span>)}</div>
      <div className="modal-actions"><button className="button secondary" onClick={onClose}>{t('jobs.close')}</button>
        <button className="button" disabled={!canApply} onClick={onApply}>{canApply ? <>{t('jobs.applyNow')} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></> : t('jobs.lockedMessage')}</button></div>
    </section>
  </div>;
}

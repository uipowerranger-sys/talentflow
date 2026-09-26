import type { Job } from '../types';
import { t } from '../i18n';
export function JobCard({ job, saved, onSave, onDetails, onApply }: { job: Job; saved: boolean; onSave: () => void; onDetails: () => void; onApply: () => void }) {
  const canApply = job.match_score > 60;
  return <article className="job-card">
    <div className="job-card-top"><div className="job-title">
      <h3>{job.title}</h3>
      <span>{job.location} · {job.experience} · {job.employment_type}</span>
    </div>
      <div className="score">
        <strong>{job.match_score}%</strong>
        <small>{t('jobs.matchLabel')}</small></div></div><div className="job-skills">{job.skills.map((skill) =>
          <span className={job.matched_skills.includes(skill) ? 'skill-tag matched' : 'skill-tag'} key={skill}>
            {skill}
          </span>)}
    </div>
    <p className="job-description">{job.description}</p><div className="job-card-footer">
      <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-label={t(saved ? 'jobs.unsave' : 'jobs.save')}><i className={saved ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} aria-hidden="true" />
      </button>
      <span className="footer-spacer" />{!canApply &&
        <small className="threshold-note">{t('jobs.lockedMessage')}</small>}
      <button className="button secondary" onClick={onDetails}>{t('jobs.viewDetails')}</button>
      <button className="button" disabled={!canApply} onClick={onApply}>{t('jobs.applyNow')} <i className={canApply ? 'fa-solid fa-arrow-right' : 'fa-solid fa-lock'} aria-hidden="true" />
      </button>
    </div>
  </article>;
}

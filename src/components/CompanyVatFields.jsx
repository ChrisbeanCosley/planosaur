// The "Do you have a company? / VAT registered? / VAT rate" questions, shared by sign-up and Settings.
// Works on a form value; use companyFormFromProfile() / companyFormToProfile() to convert.
import { formatVatRate, percentToRate, STANDARD_VAT, VARIABLE } from '../utils/vat';
import './CompanyVatFields.css';

export const emptyCompanyForm = {
  hasCompany: false,
  companyName: '',
  vatRegistered: false,
  vatChoice: 'standard', // 'standard' | 'other' | 'variable'
  otherPercent: '',
  vatNumber: '',
};

export function companyFormFromProfile({ hasCompany, companyName, vatRegistered, vatRate, vatNumber }) {
  const vatChoice = vatRate === VARIABLE ? 'variable' : typeof vatRate === 'number' && vatRate !== STANDARD_VAT ? 'other' : 'standard';
  return {
    hasCompany,
    companyName,
    vatRegistered,
    vatChoice,
    otherPercent: vatChoice === 'other' ? formatVatRate(vatRate).replace('%', '') : '',
    vatNumber,
  };
}

// Returns { profile } ready for updateCompany / sign-up metadata, or { error } when something's missing.
export function companyFormToProfile(form) {
  if (!form.hasCompany) return { profile: { hasCompany: false, companyName: '', vatRegistered: false, vatRate: null, vatNumber: '' } };
  if (!form.companyName.trim()) return { error: 'Please enter your company name.' };
  if (!form.vatRegistered) {
    return { profile: { hasCompany: true, companyName: form.companyName.trim(), vatRegistered: false, vatRate: null, vatNumber: '' } };
  }
  let vatRate = STANDARD_VAT;
  if (form.vatChoice === 'variable') vatRate = VARIABLE;
  if (form.vatChoice === 'other') {
    vatRate = percentToRate(form.otherPercent);
    if (vatRate === null) return { error: 'Enter your VAT rate as a percentage between 0 and 100.' };
  }
  return {
    profile: { hasCompany: true, companyName: form.companyName.trim(), vatRegistered: true, vatRate, vatNumber: form.vatNumber.trim() },
  };
}

function YesNo({ label, value, onChange, disabled }) {
  return (
    <div className="form-row">
      <span>{label}</span>
      <div className="view-toggle yes-no" role="group" aria-label={label}>
        {[
          [true, 'Yes'],
          [false, 'No'],
        ].map(([v, text]) => (
          <button key={text} type="button" className={value === v ? 'is-active' : ''} aria-pressed={value === v} onClick={() => onChange(v)} disabled={disabled}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CompanyVatFields({ value, onChange, disabled }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="company-vat">
      <YesNo label="Do you have a company?" value={value.hasCompany} onChange={(hasCompany) => set({ hasCompany })} disabled={disabled} />

      {value.hasCompany && (
        <>
          <label className="form-row">
            <span>Company name</span>
            <input
              className="field"
              value={value.companyName}
              onChange={(e) => set({ companyName: e.target.value })}
              placeholder="e.g. Planosaur Studio (Pty) Ltd"
              autoComplete="organization"
              required
              disabled={disabled}
            />
          </label>

          <YesNo
            label="Is your company VAT registered?"
            value={value.vatRegistered}
            onChange={(vatRegistered) => set({ vatRegistered })}
            disabled={disabled}
          />

          {value.vatRegistered && (
            <>
              <div className="form-row-group">
                <label className="form-row">
                  <span>VAT rate</span>
                  <select className="field" value={value.vatChoice} onChange={(e) => set({ vatChoice: e.target.value })} disabled={disabled}>
                    <option value="standard">{formatVatRate(STANDARD_VAT)} (standard)</option>
                    <option value="other">Another rate…</option>
                    <option value="variable">Variable (choose per invoice)</option>
                  </select>
                </label>
                {value.vatChoice === 'other' ? (
                  <label className="form-row">
                    <span>Rate (%)</span>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={value.otherPercent}
                      onChange={(e) => set({ otherPercent: e.target.value })}
                      placeholder="e.g. 20"
                      required
                      disabled={disabled}
                    />
                  </label>
                ) : (
                  <label className="form-row">
                    <span>VAT number (optional)</span>
                    <input className="field" value={value.vatNumber} onChange={(e) => set({ vatNumber: e.target.value })} placeholder="e.g. 4123456789" disabled={disabled} />
                  </label>
                )}
              </div>
              {value.vatChoice === 'other' && (
                <label className="form-row">
                  <span>VAT number (optional)</span>
                  <input className="field" value={value.vatNumber} onChange={(e) => set({ vatNumber: e.target.value })} placeholder="e.g. 4123456789" disabled={disabled} />
                </label>
              )}
              <p className="company-vat__hint">
                {value.vatChoice === 'variable'
                  ? 'You’ll pick the VAT rate on each invoice.'
                  : 'New invoices add VAT at this rate. You can still change it on any invoice.'}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

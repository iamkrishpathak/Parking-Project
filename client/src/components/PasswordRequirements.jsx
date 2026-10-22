import { PASSWORD_RULES } from '../utils/passwordPolicy';

const PasswordRequirements = ({ password, id }) => (
  <ul id={id} className="mt-2 grid gap-1 sm:grid-cols-2" aria-label="Password requirements">
    {PASSWORD_RULES.map((rule) => {
      const satisfied = rule.test(password);
      return (
        <li key={rule.key} className={`flex items-center gap-2 text-xs ${satisfied ? 'text-emerald-700' : 'text-slate-500'}`}>
          <span aria-hidden="true" className="w-3 font-bold">{satisfied ? '✓' : '○'}</span>
          {rule.label}
        </li>
      );
    })}
  </ul>
);

export default PasswordRequirements;

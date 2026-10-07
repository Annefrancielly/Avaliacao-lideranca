import type { ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../session/SessionContext';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export function LeaderSwitcher() {
  const { leaderId, selectLeader } = useSession();
  const navigate = useNavigate();
  const employees = useQuery({ queryKey: ['employees'], queryFn: api.listEmployees, staleTime: Infinity });
  const current = employees.data?.find((e) => e.id === leaderId);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    selectLeader(value === '' ? null : Number(value));
    navigate('/');
  }

  return (
    <div className="switcher">
      {current ? (
        <Avatar id={current.id} name={current.name} size="sm" />
      ) : (
        <span className="avatar avatar--sm avatar--empty" aria-hidden="true" />
      )}
      <div className="switcher__field">
        <label htmlFor="leader-select" className="switcher__label">
          Avaliando como
        </label>
        <select
          id="leader-select"
          className="switcher__select"
          value={leaderId ?? ''}
          onChange={handleChange}
          disabled={employees.isPending || employees.isError}
        >
          <option value="">Escolha um líder</option>
          {employees.data?.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} ({employee.position_name})
            </option>
          ))}
        </select>
      </div>
      <Icon name="chevronDown" size={16} className="switcher__chevron" />
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

type CatalogItem = { id: number; name: string };

export function HrCatalogManager() {
  const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const categories = useQuery({ queryKey: ['hr-categories'], queryFn: () => api<CatalogItem[]>('/hr/categories') });
  const skills = useQuery({ queryKey: ['hr-skills'], queryFn: () => api<CatalogItem[]>('/hr/skills') });

  async function add(event: FormEvent<HTMLFormElement>, path: string, queryKey: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(path, { method: 'POST', body: JSON.stringify({ name: data.get('name') }) });
      form.reset();
      setNotice('Added successfully.');
      await client.invalidateQueries({ queryKey: [queryKey] });
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not add this item.'); }
  }

  async function rename(item: CatalogItem, path: string, queryKey: string) {
    const name = window.prompt(`Rename “${item.name}”`, item.name)?.trim();
    if (!name || name === item.name) return;
    try {
      await api(`${path}/${item.id}`, { method: 'PUT', body: JSON.stringify({ name }) });
      setNotice('Updated successfully.');
      await Promise.all([client.invalidateQueries({ queryKey: [queryKey] }), client.invalidateQueries({ queryKey: ['hr-jobs'] }), client.invalidateQueries({ queryKey: ['jobs'] })]);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not update this item.'); }
  }

  async function remove(item: CatalogItem, path: string, queryKey: string) {
    if (!window.confirm(`Delete “${item.name}”?`)) return;
    try {
      await api(`${path}/${item.id}`, { method: 'DELETE' });
      setNotice('Deleted successfully.');
      await client.invalidateQueries({ queryKey: [queryKey] });
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not delete this item.'); }
  }

  return <div className="hr-catalog"><h3>Manage categories and required skills</h3><p>Add, rename, or delete entries. Categories and skills use separate API endpoints.</p><div className="catalog-columns"><div><h4>Job categories</h4><form className="catalog-add" onSubmit={(event) => void add(event, '/hr/categories', 'hr-categories')}><input name="name" placeholder="New category" required maxLength={120} /><button className="button secondary" type="submit">Add</button></form>{categories.data?.map((item) => <div className="catalog-item" key={item.id}><span>{item.name}</span><button type="button" onClick={() => void rename(item, '/hr/categories', 'hr-categories')}>Edit</button><button type="button" onClick={() => void remove(item, '/hr/categories', 'hr-categories')}>Delete</button></div>)}</div><div><h4>Required skills</h4><form className="catalog-add" onSubmit={(event) => void add(event, '/hr/skills', 'hr-skills')}><input name="name" placeholder="New skill" required maxLength={120} /><button className="button secondary" type="submit">Add</button></form>{skills.data?.map((item) => <div className="catalog-item" key={item.id}><span>{item.name}</span><button type="button" onClick={() => void rename(item, '/hr/skills', 'hr-skills')}>Edit</button><button type="button" onClick={() => void remove(item, '/hr/skills', 'hr-skills')}>Delete</button></div>)}</div></div>{notice && <p className="staff-notice" role="status">{notice}</p>}</div>;
}

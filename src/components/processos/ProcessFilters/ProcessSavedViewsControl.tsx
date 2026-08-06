'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, Check, Pencil, Save, Trash2, X } from 'lucide-react';
import { useProcessTablePreferences } from '@/components/processos/ProcessTable/ProcessTableProvider';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { serializeProcessFilters, type ProcessFilterState } from '@/lib/process-filters';
import {
  createSavedProcessView,
  loadSavedProcessViews,
  saveProcessViews,
  updateSavedProcessView,
  type SavedProcessView,
} from '@/lib/process-saved-views';
import styles from '@/components/filters/FilterPanel.module.css';

export function ProcessSavedViewsControl({
  filters,
  allowedTribunals,
  compact = false,
}: {
  filters: ProcessFilterState;
  allowedTribunals: readonly string[];
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { preferences, setPreferences } = useProcessTablePreferences();
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedProcessView[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [message, setMessage] = useState('');
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    const frame = window.requestAnimationFrame(update);
    media.addEventListener('change', update);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener('change', update);
    };
  }, []);

  function persist(next: SavedProcessView[]) {
    setViews(next);
    saveProcessViews(next);
  }

  function saveNew() {
    if (!newName.trim()) return;
    const view = createSavedProcessView(newName, filters, preferences, allowedTribunals);
    persist([view, ...views]);
    setSelectedId(view.id);
    setNewName('');
    setMessage('Visualização salva.');
  }

  function applyView(view: SavedProcessView) {
    setPreferences(view.table);
    setSelectedId(view.id);
    const params = serializeProcessFilters(view.filters);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
    setOpen(false);
  }

  function overwrite(view: SavedProcessView) {
    const next = views.map(item => item.id === view.id
      ? updateSavedProcessView(item, { filters, table: preferences }, allowedTribunals)
      : item);
    persist(next);
    setSelectedId(view.id);
    setMessage('Visualização atualizada.');
  }

  function finishRename(view: SavedProcessView) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    persist(views.map(item => item.id === view.id
      ? updateSavedProcessView(item, { name: renameValue }, allowedTribunals)
      : item));
    setRenamingId(null);
    setRenameValue('');
  }

  function removeView(view: SavedProcessView) {
    if (!window.confirm(`Excluir a visualização “${view.name}”?`)) return;
    persist(views.filter(item => item.id !== view.id));
    if (selectedId === view.id) setSelectedId(null);
    setMessage('Visualização excluída.');
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon-lg' : 'default'}
        className={styles.viewsTrigger}
        onClick={() => {
          setViews(loadSavedProcessViews(allowedTribunals));
          setMessage('');
          setOpen(true);
        }}
        aria-label={compact ? 'Abrir visualizações salvas' : undefined}
      >
        <Bookmark />
        {!compact && <span>Visualizações</span>}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={mobile ? 'bottom' : 'right'} className={styles.viewsSheet} showCloseButton={false}>
          <SheetHeader className={styles.sheetHeader}>
            <div>
              <SheetTitle>Visualizações salvas</SheetTitle>
              <SheetDescription>Reabra uma combinação de filtros e organização da tabela.</SheetDescription>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => setOpen(false)} aria-label="Fechar visualizações">
              <X />
            </Button>
          </SheetHeader>

          <div className={styles.viewsBody}>
            <Field className={styles.saveViewField}>
              <FieldLabel htmlFor={`view-name-${compact ? 'mobile' : 'desktop'}`}>Salvar configuração atual</FieldLabel>
              <div className={styles.saveViewRow}>
                <Input
                  id={`view-name-${compact ? 'mobile' : 'desktop'}`}
                  value={newName}
                  onChange={event => setNewName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      saveNew();
                    }
                  }}
                  maxLength={60}
                  placeholder="Ex.: Novidades do TRF1"
                />
                <Button type="button" onClick={saveNew} disabled={!newName.trim()}>
                  <Save />
                  Salvar
                </Button>
              </div>
            </Field>

            <div className={styles.viewsListHeader}>
              <h3>Minhas visualizações</h3>
              <span>{views.length}/30</span>
            </div>

            {views.length ? (
              <ul className={styles.viewsList}>
                {views.map(view => (
                  <li key={view.id} className={styles.viewItem} data-selected={selectedId === view.id || undefined}>
                    <div className={styles.viewCopy}>
                      {renamingId === view.id ? (
                        <Input
                          value={renameValue}
                          autoFocus
                          maxLength={60}
                          aria-label="Novo nome da visualização"
                          onChange={event => setRenameValue(event.target.value)}
                          onBlur={() => finishRename(view)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') finishRename(view);
                            if (event.key === 'Escape') setRenamingId(null);
                          }}
                        />
                      ) : (
                        <>
                          <strong>{view.name}</strong>
                          <span>Atualizada em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(view.updatedAt))}</span>
                        </>
                      )}
                    </div>
                    <div className={styles.viewActions}>
                      <Button type="button" variant="outline" size="sm" onClick={() => applyView(view)}>
                        <Check />
                        Aplicar
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => overwrite(view)} aria-label={`Atualizar ${view.name} com a configuração atual`}>
                        <Save />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => { setRenamingId(view.id); setRenameValue(view.name); }} aria-label={`Renomear ${view.name}`}>
                        <Pencil />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeView(view)} aria-label={`Excluir ${view.name}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.viewsEmpty}>
                <Bookmark aria-hidden="true" />
                <strong>Nenhuma visualização salva</strong>
                <span>Ajuste filtros e colunas, dê um nome e salve para reutilizar.</span>
              </div>
            )}

            <p className={styles.viewMessage} aria-live="polite">{message}</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

import ArrowDownIcon from '../../../assets/icons/kg-toggle-arrow.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import React from 'react';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {useKoenigEditable} from '../../../../additions/preview/PreviewContext';
import {useKoenigStrings} from '../../../../additions/options';

// A stack of toggles that touch: one outline around the whole stack, a line between the items,
// no gap. A reader opens and closes each item on its own; which are open belongs to the reader's
// page, not the document.
export function ToggleGroupCard({itemEditors = [], isEditing = false, onAddItem, onRemoveItem}) {
    const editable = useKoenigEditable();
    const strings = useKoenigStrings();
    const [open, setOpen] = React.useState(() => new Set());
    const baseId = React.useId();
    const reading = !editable;

    const toggle = (editor) => setOpen((current) => {
        const next = new Set(current);
        if (next.has(editor)) {
            next.delete(editor);
        } else {
            next.add(editor);
        }
        return next;
    });

    return (
        <>
            <div className='overflow-hidden rounded-md border border-grey/40 dark:border-grey/30' data-kg-toggle-group>
                {itemEditors.map((item, index) => {
                    const isOpen = open.has(item.headingEditor);
                    const panelId = `${baseId}-${index}`;
                    return (
                        <div key={item.headingEditor._key ?? index} className={`px-6 py-4 ${index > 0 ? 'border-t border-grey/40 dark:border-grey/30' : ''}`} data-kg-toggle-group-item={index}>
                            <div
                                className={`flex items-start justify-between ${reading ? 'cursor-pointer' : 'cursor-text'}`}
                                data-kg-toggle-heading={reading ? '' : undefined}
                                onClick={reading ? () => toggle(item.headingEditor) : undefined}
                            >
                                <div className="mr-2 w-full">
                                    <KoenigNestedEditor
                                        autoFocus={index === 0}
                                        focusNext={item.contentEditor}
                                        initialEditor={item.headingEditor}
                                        initialEditorState={item.headingEditorInitialState}
                                        nodes='minimal'
                                        placeholderClassName={'!font-sans !text-2xl !leading-[1.1] !font-bold !tracking-tight text-black dark:text-grey-50 opacity-40'}
                                        placeholderText={strings.toggle.headingPlaceholder}
                                        skipCollabChecks={true}
                                        singleParagraph={true}
                                        textClassName={'koenig-lexical-heading heading-xsmall whitespace-normal text-black dark:text-grey-50 opacity-100'}
                                    />
                                </div>
                                {reading ? (
                                    <button
                                        aria-controls={panelId}
                                        aria-expanded={isOpen}
                                        aria-label={isOpen ? strings.toggle.collapse : strings.toggle.expand}
                                        className='z-20 !mt-[-1px] ml-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent outline-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-grey-500'
                                        data-kg-toggle-button
                                        type='button'
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            toggle(item.headingEditor);
                                        }}
                                    >
                                        <ArrowDownIcon className={`size-4 stroke-2 text-grey-600 transition-transform duration-150 motion-reduce:transition-none dark:text-grey-400 ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                ) : (
                                    <div className='z-20 !mt-[-1px] ml-auto flex shrink-0 items-center gap-1'>
                                        {isEditing && itemEditors.length > 1 ? (
                                            <button
                                                aria-label={strings.toggleGroup.removeItem.replace('{number}', String(index + 1))}
                                                className='flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-xl leading-none text-grey-600 outline-0 hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-grey-500 dark:text-grey-400 dark:hover:bg-grey-900'
                                                data-kg-toggle-group-remove={index}
                                                type='button'
                                                onClick={() => onRemoveItem(index)}
                                                onMouseDown={event => event.preventDefault()}
                                            >
                                                {'×'}
                                            </button>
                                        ) : null}
                                        <div className='flex size-8 items-center justify-center'>
                                            <ArrowDownIcon className={'size-4 stroke-2 text-grey-400 dark:text-grey/30'} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={'!mt-2 w-full'} data-kg-toggle-panel hidden={reading && !isOpen} id={panelId}>
                                <KoenigNestedEditor
                                    initialEditor={item.contentEditor}
                                    initialEditorState={item.contentEditorInitialState}
                                    placeholderClassName={'font-serif text-xl font-normal !leading-[1.6em] text-grey-900 dark:text-grey-100 opacity-40'}
                                    placeholderText={strings.toggle.contentPlaceholder}
                                    skipCollabChecks={true}
                                    textClassName={'whitespace-normal font-serif text-xl font-normal text-grey-900 dark:text-grey-100 opacity-100'}
                                />
                            </div>
                        </div>
                    );
                })}
                {isEditing ? (
                    <button
                        className='block w-full cursor-pointer border-0 border-t border-grey/40 bg-transparent px-6 py-3 text-left font-sans text-lg font-medium text-grey-700 outline-0 hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-grey-500 dark:border-grey/30 dark:text-grey-300 dark:hover:bg-grey-900'
                        data-kg-toggle-group-add
                        type='button'
                        onClick={onAddItem}
                        onMouseDown={event => event.preventDefault()}
                    >
                        + {strings.toggleGroup.addItem}
                    </button>
                ) : null}
            </div>
            {!isEditing && !reading && <ReadOnlyOverlay />}
        </>
    );
}

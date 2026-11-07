import ArrowDownIcon from '../../../assets/icons/kg-toggle-arrow.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import React from 'react';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {useKoenigEditable} from '../../../../additions/preview/PreviewContext';
import {useKoenigStrings} from '../../../../additions/options';

export function ToggleCard({
    contentEditor,
    contentEditorInitialState,
    contentPlaceholder = 'Collapsible content',
    headingEditor,
    headingEditorInitialState,
    headingPlaceholder = 'Toggle header',
    isEditing = false
}) {
    // A reader sees a toggle that is closed to begin with and opens and closes on a click. That
    // state belongs to the reader's page, not the document, so it is only kept here.
    const editable = useKoenigEditable();
    const strings = useKoenigStrings();
    const [open, setOpen] = React.useState(false);
    const panelId = React.useId();
    const reading = !editable;
    return (
        <>
            <div className='rounded-md border border-grey/40 px-6 py-4 dark:border-grey/30'>
                <div
                    className={`flex items-start justify-between ${reading ? 'cursor-pointer' : 'cursor-text'}`}
                    data-kg-toggle-heading={reading ? '' : undefined}
                    onClick={reading ? () => setOpen(current => !current) : undefined}
                >
                    <div className="mr-2 w-full">
                        <KoenigNestedEditor
                            autoFocus={true}
                            focusNext={contentEditor}
                            initialEditor={headingEditor}
                            initialEditorState={headingEditorInitialState}
                            nodes='minimal'
                            placeholderClassName={'!font-sans !text-2xl !leading-[1.1] !font-bold !tracking-tight text-black dark:text-grey-50 opacity-40'}
                            placeholderText={headingPlaceholder}
                            singleParagraph={true}
                            textClassName={'koenig-lexical-heading heading-xsmall whitespace-normal text-black dark:text-grey-50 opacity-100'}
                        />
                    </div>
                    {reading ? (
                        <button
                            aria-controls={panelId}
                            aria-expanded={open}
                            aria-label={open ? strings.toggle.collapse : strings.toggle.expand}
                            className='z-20 !mt-[-1px] ml-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent outline-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-grey-500'
                            data-kg-toggle-button
                            type='button'
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpen(current => !current);
                            }}
                        >
                            <ArrowDownIcon className={`size-4 stroke-2 text-grey-600 transition-transform duration-150 motion-reduce:transition-none dark:text-grey-400 ${open ? 'rotate-180' : ''}`} />
                        </button>
                    ) : (
                        <div className='z-20 !mt-[-1px] ml-auto flex size-8 shrink-0 items-center justify-center'>
                            <ArrowDownIcon className={'size-4 stroke-2 text-grey-400 dark:text-grey/30'} />
                        </div>
                    )}
                </div>
                <div className={'!mt-2 w-full'} hidden={reading && !open} id={panelId}>
                    <KoenigNestedEditor
                        initialEditor={contentEditor}
                        initialEditorState={contentEditorInitialState}
                        placeholderClassName={'font-serif text-xl font-normal !leading-[1.6em] text-grey-900 dark:text-grey-100 opacity-40'}
                        placeholderText={contentPlaceholder}
                        textClassName={'whitespace-normal font-serif text-xl font-normal text-grey-900 dark:text-grey-100 opacity-100'}
                    />
                </div>
            </div>
            {!isEditing && !reading && <ReadOnlyOverlay />}
        </>
    );
}

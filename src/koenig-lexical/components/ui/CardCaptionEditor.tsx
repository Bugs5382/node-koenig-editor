import KoenigCaptionEditor from '../KoenigCaptionEditor';
import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import {TextInput} from './TextInput';
import {isEditorEmpty} from '../../utils/isEditorEmpty';

function CaptionInput({captionEditor, captionEditorInitialState, placeholder, dataTestId}) {
    return (
        <div
            className={`m-0 w-full px-9 text-center`}
            data-testid={dataTestId}
            data-kg-allow-clickthrough
        >
            <KoenigCaptionEditor
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                placeholderText={placeholder}
            />
        </div>
    );
}

function AltTextInput({value, placeholder, onChange, readOnly, dataTestId, autoFocus = true}) {
    const handleChange = (e) => {
        onChange?.(e.target.value);
    };

    return (
        <TextInput
            autoFocus={autoFocus}
            className="not-kg-prose w-full bg-transparent px-9 text-center font-sans text-sm font-normal leading-[1.625] tracking-wide text-grey-800 placeholder:text-grey-500 dark:text-grey-500 dark:placeholder:text-grey-800"
            data-testid={dataTestId}
            placeholder={placeholder}
            readOnly={readOnly}
            value={value}
            data-koenig-dnd-disabled
            onChange={handleChange}
        />
    );
}

function AltToggleButton({isEditingAlt, onClick}) {
    return (
        <button
            className={`absolute bottom-0 right-0 m-2 cursor-pointer rounded-md border px-1 font-sans text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${isEditingAlt ? 'border-selection bg-selection text-white' : 'border-grey text-grey' } `}
            data-testid="alt-toggle-button"
            name="alt-toggle-button"
            type="button"
            onClick={onClick}
        >
            Alt
        </button>
    );
}

export function CardCaptionEditor({
    altText,
    altTextPlaceholder,
    setAltText,
    captionEditor,
    captionEditorInitialState,
    captionPlaceholder,
    isSelected,
    readOnly,
    dataTestId
}) {
    const [isEditingAlt, setIsEditingAlt] = React.useState(false);

    const toggleIsEditingAlt = (e) => {
        e.stopPropagation();
        setIsEditingAlt(!isEditingAlt);
    };

    // always switch back to displaying caption when card is not selected
    React.useEffect(() => {
        if (!isSelected) {
            setIsEditingAlt(false);
        }
    }, [isSelected, setIsEditingAlt]);

    const {collaboration} = React.useContext(KoenigComposerContext);
    const isCaptionEmpty = isEditorEmpty(captionEditor);
    const showAltToggle = setAltText && isSelected;
    const isShown = isSelected || !isCaptionEmpty;

    // In a shared session the caption editor stays mounted while it is hidden, so it is bound to
    // the shared document and receives what the other windows type; the card shows it as soon
    // as the caption has text.
    const [, refresh] = React.useReducer(count => count + 1, 0);
    const wasEmpty = React.useRef(isCaptionEmpty);
    React.useEffect(() => {
        if (!collaboration) {
            return undefined;
        }
        return captionEditor.registerUpdateListener(() => {
            const empty = isEditorEmpty(captionEditor);
            if (empty !== wasEmpty.current) {
                wasEmpty.current = empty;
                refresh();
            }
        });
    }, [captionEditor, collaboration]);

    return (
        ((isShown || collaboration) &&
            <figcaption className={isShown ? "flex min-h-[40px] w-full p-2" : "hidden"}>
                {isEditingAlt
                    ? <AltTextInput dataTestId={dataTestId} placeholder={altTextPlaceholder} readOnly={readOnly} value={altText} onChange={setAltText} />
                    : <CaptionInput captionEditor={captionEditor} captionEditorInitialState={captionEditorInitialState} dataTestId={dataTestId} placeholder={captionPlaceholder} /> }
                {showAltToggle && <AltToggleButton isEditingAlt={isEditingAlt} onClick={toggleIsEditingAlt} />}
            </figcaption>
        )
    );
}

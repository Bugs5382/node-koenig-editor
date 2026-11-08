import KoenigComposerContext from '../../../context/KoenigComposerContext.jsx';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import React from 'react';
import {ColorSetting} from '../../../../additions/colors/ColorSetting';
import {SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {isColorValue} from '../../../../additions/colors/colors';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {AnchoredMenu} from '../../../../additions/placement/AnchoredMenu';
import {EmojiPicker} from '../../../../additions/emojiPicker/EmojiPicker';
import {useKoenigEditable} from '../../../../additions/preview/PreviewContext';
import {useKoenigStrings, useKoenigTool} from '../../../../additions/options';

export const CALLOUT_COLORS = {
    white: 'bg-transparent border-grey/30',
    grey: 'bg-grey/10 border-transparent',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent',
    pink: 'bg-pink/10 border-transparent',
    purple: 'bg-purple/10 border-transparent',
    accent: 'bg-accent border-transparent'
};

const TEXT_BLACK = 'text-black dark:text-grey-300 caret-black dark:caret-grey-300';
const TEXT_WHITE = 'text-white caret-white';

export const CALLOUT_TEXT_COLORS = {
    white: TEXT_BLACK,
    grey: TEXT_BLACK,
    blue: TEXT_BLACK,
    green: TEXT_BLACK,
    yellow: TEXT_BLACK,
    red: TEXT_BLACK,
    pink: TEXT_BLACK,
    purple: TEXT_BLACK,
    // .kg-callout-accent makes sure links are not in accent color anymore
    accent: TEXT_WHITE + ' kg-callout-accent'
};

export const calloutColorPicker = [
    {
        label: 'White',
        name: 'white',
        color: 'bg-transparent border-black/15 dark:border-white/10'
    },
    {
        label: 'Grey',
        name: 'grey',
        color: 'bg-grey/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Blue',
        name: 'blue',
        color: 'bg-blue/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Green',
        name: 'green',
        color: 'bg-green/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        color: 'bg-yellow/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Red',
        name: 'red',
        color: 'bg-red/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Pink',
        name: 'pink',
        color: 'bg-pink/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Purple',
        name: 'purple',
        color: 'bg-purple/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Accent',
        name: 'accent',
        color: 'bg-accent border-black/[0.08] dark:border-white/10'
    }
];

export function CalloutCard({
    color = 'green',
    isEditing,
    setShowEmojiPicker,
    toggleEmoji,
    hasEmoji = true,
    handleColorChange,
    handleTextColorChange,
    pairedText = false,
    textColor,
    changeEmoji,
    calloutEmoji = '\u{1F4A1}',
    textEditor,
    textEditorInitialState,
    nodeKey,
    toggleEmojiPicker,
    showEmojiPicker
}) {
    const strings = useKoenigStrings();
    const emojiButtonRef = React.useRef(null);
    const emojiPickerRef = React.useRef(null);
    const emojiPickerOn = useKoenigTool('emojiPicker');
    const editable = useKoenigEditable();
    const {darkMode} = React.useContext(KoenigComposerContext);

    React.useEffect(() => {
        if (!isEditing) {
            setShowEmojiPicker(false);
        }
    }, [isEditing, setShowEmojiPicker]);

    const customBackground = isColorValue(color);
    const customText = isColorValue(textColor);

    return (
        <>
            <div
                className={`flex rounded-md border px-7 py-5 ${customBackground ? 'border-transparent' : CALLOUT_COLORS[color]} `}
                data-testid={`callout-bg-${customBackground ? 'custom' : color}`}
                style={{...(customBackground ? {backgroundColor: color} : {}), ...(customText ? {color: textColor} : {})}}
            >
                <div className="relative">
                    {hasEmoji &&
                    <>
                        {editable ? (
                            <button
                                ref={emojiButtonRef}
                                className={`mr-2 cursor-pointer rounded-md px-2 text-xl ${isEditing ? 'hover:bg-grey-500/20' : ''} ` }
                                data-testid="emoji-picker-button"
                                type="button"
                                onClick={toggleEmojiPicker}
                            >
                                {calloutEmoji}
                            </button>
                        ) : (
                            // a reader sees the emoji, not a button that opens a picker
                            <span className="mr-2 px-2 text-xl" data-testid="callout-emoji">{calloutEmoji}</span>
                        )}
                        {emojiPickerOn && showEmojiPicker && isEditing && (
                            // In the editor's floating layer, placed inside the window and clear of a
                            // host's clipping box; it flips above the button when there is no room below.
                            <AnchoredMenu anchor={emojiButtonRef.current} containerRef={emojiPickerRef} measure="whole">
                                <EmojiPicker onClose={toggleEmojiPicker} onSelect={changeEmoji} />
                            </AnchoredMenu>
                        )}
                    </>}
                </div>
                <KoenigNestedEditor
                    autoFocus={true}
                    defaultKoenigEnterBehaviour={true}
                    initialEditor={textEditor}
                    initialEditorState={textEditorInitialState}
                    nodes='minimal'
                    placeholderClassName={`font-serif text-xl font-normal tracking-wide text-grey-500 !dark:text-white opacity-30`}
                    placeholderText={strings.callout.placeholder}
                    singleParagraph={true}
                    textClassName={`!my-0 w-full whitespace-normal bg-transparent font-serif text-xl font-normal ${customText ? 'caret-current' : (customBackground ? TEXT_BLACK : CALLOUT_TEXT_COLORS[color])}`}
                />
            </div>
            {
                isEditing ? (
                    <SettingsPanel
                        darkMode={darkMode}
                    >
                        <ToggleSetting
                            dataTestId='emoji-toggle'
                            isChecked={!!calloutEmoji}
                            label={strings.callout.emoji}
                            onChange={toggleEmoji}
                        />
                        <ColorSetting
                            dataTestId='callout-color-picker'
                            label={strings.callout.background}
                            slot='calloutBackground'
                            value={color}
                            onChange={handleColorChange}
                        />
                        {pairedText ? null : (
                            <ColorSetting
                                dataTestId='callout-text-color-picker'
                                label={strings.callout.textColor}
                                slot='calloutText'
                                value={textColor}
                                onChange={handleTextColorChange}
                            />
                        )}
                    </SettingsPanel>
                ) : (
                    <ReadOnlyOverlay />
                )
            }
        </>
    );
}

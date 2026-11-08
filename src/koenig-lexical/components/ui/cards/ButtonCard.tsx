import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import RightAlignIcon from '../../../assets/icons/kg-align-right.svg?react';
import React from 'react';
import {Button} from '../Button';
import {ColorSetting} from '../../../../additions/colors/ColorSetting';
import {EmojiField} from '../../../../additions/emojiPicker/EmojiField';
import {isColorValue} from '../../../../additions/colors/colors';
import {ButtonGroupSetting, InputSetting, SettingsPanel} from '../SettingsPanel';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {isSafeUrl} from '#kg-default-nodes';
import {useKoenigStrings} from '../../../../additions/options';

const JUSTIFY = {left: 'justify-start', center: 'justify-center', right: 'justify-end'};

export function ButtonCard({
    alignment,
    backgroundColor,
    buttonEmoji,
    buttonText,
    buttonPlaceholder,
    buttonUrl,
    handleAlignmentChange,
    handleBackgroundColorChange,
    handleButtonEmojiChange,
    handleButtonTextChange,
    handleTextColorChange,
    textColor,
    handleButtonUrlChange,
    isEditing
}) {
    const strings = useKoenigStrings().button;

    // The field keeps what was typed; the card only takes it once it is an http, https or
    // mailto link (or empty), so an unsafe value never reaches the document.
    const [draftUrl, setDraftUrl] = React.useState(buttonUrl || '');
    React.useEffect(() => {
        setDraftUrl((current) => (isSafeUrl(current) || current.trim() === '' ? buttonUrl || '' : current));
    }, [buttonUrl]);
    const urlIsInvalid = draftUrl.trim() !== '' && !isSafeUrl(draftUrl);

    const onUrlChange = (event) => {
        const value = event.target.value;
        setDraftUrl(value);
        if (value.trim() === '' || isSafeUrl(value)) {
            handleButtonUrlChange(value.trim());
        }
    };

    const buttonGroupChildren = [
        {
            label: strings.alignLeft,
            name: 'left',
            Icon: LeftAlignIcon,
            dataTestId: 'button-align-left'
        },
        {
            label: strings.alignCenter,
            name: 'center',
            Icon: CenterAlignIcon,
            dataTestId: 'button-align-center'
        },
        {
            label: strings.alignRight,
            name: 'right',
            Icon: RightAlignIcon,
            dataTestId: 'button-align-right'
        }
    ];

    const label = [buttonEmoji, buttonText].filter(Boolean).join(' ');
    const colours = {
        ...(isColorValue(backgroundColor) ? {backgroundColor} : {}),
        ...(isColorValue(textColor) ? {color: textColor} : {})
    };

    return (
        <>
            <div className="inline-block w-full">
                <div className={`my-3 flex items-center ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} ${JUSTIFY[alignment] || 'justify-center'} `} data-testid="button-card">
                    <Button dataTestId="button-card-btn" href={buttonUrl} placeholder={buttonPlaceholder} shrink={true} style={colours} value={label} />
                </div>
            </div>
            <ReadOnlyOverlay />
            {isEditing && (
                <SettingsPanel>
                    <ButtonGroupSetting
                        buttons={buttonGroupChildren}
                        label={strings.alignment}
                        selectedName={alignment}
                        onClick={handleAlignmentChange}
                    />
                    <div className="flex w-full items-end gap-2">
                        <EmojiField
                            label={strings.emoji}
                            placeholder={strings.emojiPlaceholder}
                            removeLabel={strings.emojiRemove}
                            style={{padding: '0.4rem 0.8rem', border: '1px solid var(--kg-color-grey-300, #DDE1E5)', borderRadius: '0.4rem'}}
                            value={buttonEmoji}
                            onChange={handleButtonEmojiChange}
                        />
                    </div>
                    <InputSetting
                        dataTestId="button-input-text"
                        label={strings.text}
                        placeholder={strings.textPlaceholder}
                        value={buttonText}
                        onChange={handleButtonTextChange}
                    />
                    <ColorSetting
                        dataTestId="button-color-picker"
                        label={strings.backgroundColor}
                        slot="buttonBackground"
                        value={backgroundColor}
                        onChange={handleBackgroundColorChange}
                    />
                    <ColorSetting
                        dataTestId="button-text-color-picker"
                        label={strings.textColor}
                        slot="buttonText"
                        value={textColor}
                        onChange={handleTextColorChange}
                    />
                    <InputSetting
                        dataTestId="button-input-url"
                        description={urlIsInvalid ? strings.invalidUrl : undefined}
                        label={strings.url}
                        placeholder="https://"
                        value={draftUrl}
                        onChange={onUrlChange}
                    />
                </SettingsPanel>
            )}
        </>
    );
}

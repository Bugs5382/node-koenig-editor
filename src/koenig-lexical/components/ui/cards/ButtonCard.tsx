import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, InputSetting, SettingsPanel} from '../SettingsPanel';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {isSafeUrl} from '#kg-default-nodes';
import {useKoenigStrings} from '../../../../additions/options';

export function ButtonCard({
    alignment,
    buttonText,
    buttonPlaceholder,
    buttonUrl,
    handleAlignmentChange,
    handleButtonTextChange,
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
        }
    ];

    return (
        <>
            <div className="inline-block w-full">
                <div className={`my-3 flex items-center ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} ${alignment === 'left' ? 'justify-start' : 'justify-center'} `} data-testid="button-card">
                    <Button dataTestId="button-card-btn" href={buttonUrl} placeholder={buttonPlaceholder} shrink={true} value={buttonText} />
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
                    <InputSetting
                        dataTestId="button-input-text"
                        label={strings.text}
                        placeholder={strings.textPlaceholder}
                        value={buttonText}
                        onChange={handleButtonTextChange}
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

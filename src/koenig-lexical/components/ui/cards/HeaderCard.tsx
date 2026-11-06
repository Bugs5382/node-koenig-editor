import KoenigCaptionEditor from '../../KoenigCaptionEditor';
import React from 'react';

// Every length is a multiple of --kg-rem and the type reads the host's font tokens, so the
// card scales with the rest of the editor. Colours are the card's own saved values.
const rem = n => `calc(${n} * var(--kg-rem, 0.625rem))`;

const fieldStyle = {
    border: '1px solid var(--kg-color-grey-300, #DDE1E5)',
    borderRadius: rem(0.4),
    font: `${rem(1.3)}/1.4 var(--kg-font-sans, sans-serif)`,
    padding: `${rem(0.4)} ${rem(0.8)}`,
    width: '100%'
};

function Settings({backgroundColor, backgroundImageSrc, buttonEnabled, buttonText, buttonUrl, alignment, strings, update, uploadBackgroundImage, uploadError}) {
    const fileInputRef = React.useRef(null);

    return (
        <div
            className="not-kg-prose"
            data-kg-allow-clickthrough
            data-kg-settings-panel
            data-koenig-dnd-disabled
            style={{display: 'grid', gap: rem(0.8), padding: rem(1.2), fontFamily: 'var(--kg-font-sans, sans-serif)'}}
        >
            <label style={{display: 'flex', alignItems: 'center', gap: rem(0.8), fontSize: rem(1.3)}}>
                {strings.backgroundColor}
                <input
                    data-header-background-color
                    type="color"
                    value={backgroundColor}
                    onChange={e => update({backgroundColor: e.target.value})}
                />
            </label>
            <div style={{display: 'flex', gap: rem(0.8)}}>
                <button data-header-background-image style={fieldStyle} type="button" onClick={() => fileInputRef.current?.click()}>
                    {strings.backgroundImage}
                </button>
                {backgroundImageSrc ? (
                    <button data-header-background-remove style={fieldStyle} type="button" onClick={() => update({backgroundImageSrc: '', backgroundImageWidth: null, backgroundImageHeight: null})}>
                        {strings.removeImage}
                    </button>
                ) : null}
                <input
                    ref={fileInputRef}
                    accept="image/*"
                    data-header-background-input
                    hidden
                    type="file"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            uploadBackgroundImage(file);
                        }
                    }}
                />
            </div>
            {uploadError ? <p data-header-error style={{fontSize: rem(1.3), color: 'var(--kg-color-red, #F50B23)'}}>{uploadError}</p> : null}
            <label style={{display: 'flex', alignItems: 'center', gap: rem(0.8), fontSize: rem(1.3)}}>
                {strings.alignment}
                <select style={fieldStyle} value={alignment} onChange={e => update({alignment: e.target.value})}>
                    <option value="left">{strings.alignLeft}</option>
                    <option value="center">{strings.alignCenter}</option>
                </select>
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: rem(0.8), fontSize: rem(1.3)}}>
                <input checked={buttonEnabled} data-header-button-toggle type="checkbox" onChange={e => update({buttonEnabled: e.target.checked})} />
                {strings.button}
            </label>
            {buttonEnabled ? (
                <>
                    <input data-header-button-text placeholder={strings.buttonText} style={fieldStyle} type="text" value={buttonText} onChange={e => update({buttonText: e.target.value})} />
                    <input data-header-button-url placeholder={strings.buttonUrl} style={fieldStyle} type="url" value={buttonUrl} onChange={e => update({buttonUrl: e.target.value})} />
                </>
            ) : null}
        </div>
    );
}

export function HeaderCard({
    alignment,
    backgroundColor,
    backgroundImageSrc,
    buttonColor,
    buttonEnabled,
    buttonText,
    buttonTextColor,
    buttonUrl,
    headerTextEditor,
    headerTextEditorInitialState,
    isEditing,
    strings,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    textColor,
    update,
    uploadBackgroundImage,
    uploadError
}) {
    const align = alignment === 'left' ? 'left' : 'center';
    const style = {
        backgroundColor,
        backgroundImage: backgroundImageSrc ? `url("${backgroundImageSrc}")` : undefined,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        color: textColor,
        fontFamily: 'var(--kg-font-sans, sans-serif)',
        padding: `${rem(6)} ${rem(4)}`,
        textAlign: align
    };

    return (
        <div data-kg-card="header" data-testid="header-card">
            <div className="not-kg-prose" style={style}>
                <div
                    data-header-title
                    style={{fontSize: 'var(--kg-font-size-h1, 4.4rem)', fontWeight: 700, lineHeight: 1.15}}
                >
                    <KoenigCaptionEditor
                        captionEditor={headerTextEditor}
                        captionEditorInitialState={headerTextEditorInitialState}
                        placeholderText={strings.titlePlaceholder}
                    />
                </div>
                <div
                    data-header-subtitle
                    style={{fontSize: 'var(--kg-font-size, 2rem)', marginTop: rem(1.2), opacity: 0.85}}
                >
                    <KoenigCaptionEditor
                        captionEditor={subheaderTextEditor}
                        captionEditorInitialState={subheaderTextEditorInitialState}
                        placeholderText={strings.subtitlePlaceholder}
                    />
                </div>
                {buttonEnabled && (buttonText || isEditing) ? (
                    <div style={{marginTop: rem(2.4)}}>
                        <span
                            data-header-button
                            style={{
                                background: buttonColor,
                                borderRadius: rem(0.6),
                                color: buttonTextColor,
                                display: 'inline-block',
                                fontSize: rem(1.6),
                                fontWeight: 600,
                                padding: `${rem(1)} ${rem(2.4)}`
                            }}
                        >
                            {buttonText || strings.buttonText}
                        </span>
                    </div>
                ) : null}
            </div>
            {isEditing ? (
                <Settings
                    alignment={alignment}
                    backgroundColor={backgroundColor}
                    backgroundImageSrc={backgroundImageSrc}
                    buttonEnabled={buttonEnabled}
                    buttonText={buttonText}
                    buttonUrl={buttonUrl}
                    strings={strings}
                    update={update}
                    uploadBackgroundImage={uploadBackgroundImage}
                    uploadError={uploadError}
                />
            ) : null}
        </div>
    );
}

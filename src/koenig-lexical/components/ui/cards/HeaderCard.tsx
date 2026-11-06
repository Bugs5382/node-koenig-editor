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

// One row of the settings panel: a label that never wraps and a control that takes the rest, so a
// long wording or a big text size cannot break a label mid-word.
const rowStyle = {
    alignItems: 'center',
    columnGap: rem(1.2),
    display: 'grid',
    fontSize: rem(1.3),
    gridTemplateColumns: 'max-content minmax(0, 1fr)'
};
const labelStyle = {whiteSpace: 'nowrap'};

const choiceStyle = (checked) => ({
    ...fieldStyle,
    alignItems: 'center',
    borderColor: checked ? 'var(--kg-selection, #000)' : 'var(--kg-color-grey-300, #DDE1E5)',
    cursor: 'pointer',
    display: 'flex',
    fontWeight: checked ? 600 : 400,
    justifyContent: 'center'
});

function Settings({backgroundColor, backgroundImageSrc, buttonEnabled, buttonText, buttonUrl, alignment, strings, update, uploadBackgroundImage, uploadError}) {
    const fileInputRef = React.useRef(null);
    const alignmentName = React.useId();

    return (
        <div
            className="not-kg-prose"
            data-kg-allow-clickthrough
            data-kg-settings-panel
            data-koenig-dnd-disabled
            style={{display: 'grid', gap: rem(0.8), padding: rem(1.2), fontFamily: 'var(--kg-font-sans, sans-serif)'}}
        >
            <label style={rowStyle}>
                <span data-header-label style={labelStyle}>{strings.backgroundColor}</span>
                <input
                    style={{justifySelf: 'start'}}
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
            <div style={rowStyle}>
                <span data-header-label style={labelStyle}>{strings.alignment}</span>
                {/* Two choices: a radio group opens nothing, so there is no list to land in the wrong place,
                    and the arrow keys move between the choices. */}
                <div aria-label={strings.alignment} role="radiogroup" style={{display: 'grid', gap: rem(0.8), gridTemplateColumns: '1fr 1fr'}}>
                    {[['left', strings.alignLeft], ['center', strings.alignCenter]].map(([value, text]) => (
                        <label key={value} style={choiceStyle(alignment === value)}>
                            <input
                                checked={alignment === value}
                                name={alignmentName}
                                style={{margin: `0 ${rem(0.6)} 0 0`}}
                                type="radio"
                                value={value}
                                onChange={() => update({alignment: value})}
                            />
                            {text}
                        </label>
                    ))}
                </div>
            </div>
            <label style={{...rowStyle, gridTemplateColumns: 'max-content minmax(0, 1fr)', justifyContent: 'start'}}>
                <input checked={buttonEnabled} data-header-button-toggle type="checkbox" onChange={e => update({buttonEnabled: e.target.checked})} />
                <span data-header-label style={labelStyle}>{strings.button}</span>
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

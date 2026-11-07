import React from 'react';
import VisibilityIndicator from '../../assets/icons/kg-indicator-visibility.svg?react';

// Wide and full cards break out of the content column. Upstream sized them from the viewport,
// which assumes the editor spans the page; in a host that puts it in a narrower card they spilled
// out of it. The width is now the smaller of that and the content plus --kg-breakout-room on each
// side (default 1.8rem), so a card stays near its column. A host that gives the editor the whole
// page sets --kg-breakout-room large (for example 100vw) to get the viewport widths back.
// Written out in full: Tailwind finds class names by reading the source, not by running it.
const CARD_WIDTH_CLASSES = {
    wide: [
        'w-[min(calc(75vw-var(--kg-breakout-adjustment-with-fallback)+2px),calc(100%+2*var(--kg-breakout-room-with-fallback)))] mx-[calc(50%-(50vw-var(--kg-breakout-adjustment-with-fallback))-.8rem)] min-w-[min(calc(100%+3.6rem),calc(100%+2*var(--kg-breakout-room-with-fallback)))] translate-x-[calc(50vw-50%+.8rem-var(--kg-breakout-adjustment-with-fallback))]',
        'md:min-w-[min(calc(100%+10rem),calc(100%+2*var(--kg-breakout-room-with-fallback)))]',
        'lg:min-w-[min(calc(100%+18rem),calc(100%+2*var(--kg-breakout-room-with-fallback)))]'
    ].join(' '),
    full: [
        'inset-x-[-1px] [--kg-card-w:min(calc(100vw+2px),calc(100%+2*var(--kg-breakout-room-with-fallback)))] w-[var(--kg-card-w)] ml-[calc((100%-var(--kg-card-w))/2)]',
        'lg:[--kg-card-w:min(calc(100vw-var(--kg-breakout-adjustment-with-fallback)+2px),calc(100%+2*var(--kg-breakout-room-with-fallback)))]'
    ].join(' ')
};

const DEFAULT_INDICATOR_POSITION = {
    top: '.6rem'
};

export const CardWrapper = React.forwardRef(({
    cardType,
    cardWidth = 'regular',
    feature,
    IndicatorIcon,
    indicatorPosition = DEFAULT_INDICATOR_POSITION,
    isDragging,
    isEditing,
    isSelected,
    isVisibilityActive,
    onIndicatorClick,
    wrapperStyle,
    children,
    ...props
}, ref) => {
    const wrapperClass = () => {
        if ((wrapperStyle === 'wide') && (isEditing || isSelected)) {
            return '!-mx-3 !px-3';
        } else if (((wrapperStyle === 'code-card') && isEditing)) {
            return '-mx-6';
        } else if (wrapperStyle === 'wide') {
            return 'hover:-mx-3 hover:px-3';
        } else {
            return 'border';
        }
    };

    const className = [
        'relative border-transparent caret-grey-800',
        isSelected ? 'z-20' : 'z-10', // ensure setting panels sit above other cards
        isSelected && !isDragging ? 'shadow-[0_0_0_2px] shadow-selection' : '',
        !isSelected && !isDragging ? 'hover:shadow-[0_0_0_1px] hover:shadow-selection' : '',
        CARD_WIDTH_CLASSES[cardWidth] || '',
        wrapperClass()
    ].join(' ');

    const position = {
        ...DEFAULT_INDICATOR_POSITION,
        ...(indicatorPosition || {}),
        ...(cardType === 'call-to-action' && {top: '1.4rem'})
    };

    let indicatorIcon;
    if (isVisibilityActive) {
        indicatorIcon = (
            <div className="sticky top-0 lg:top-8">
                <VisibilityIndicator
                    aria-label="Card is hidden for select audiences"
                    className="absolute left-[-6rem] size-5 cursor-pointer text-grey"
                    data-testid="visibility-indicator"
                    style={{
                        left: position.left,
                        top: position.top
                    }}
                    onClick={onIndicatorClick}
                />
            </div>
        );
    } else if (IndicatorIcon) {
        indicatorIcon = (
            <div className="sticky top-0 lg:top-8">
                <IndicatorIcon
                    aria-label={`${cardType} indicator`}
                    className="absolute left-[-6rem] size-5 text-grey"
                    style={{
                        left: position.left,
                        top: position.top
                    }}
                />
            </div>
        );
    }

    return (
        <>
            {indicatorIcon}
            <div
                ref={ref}
                className={className}
                data-kg-card={cardType}
                data-kg-card-editing={isEditing}
                data-kg-card-selected={isSelected}
                {...props}
            >
                {children}
            </div>
        </>
    );
});

CardWrapper.displayName = 'CardWrapper';

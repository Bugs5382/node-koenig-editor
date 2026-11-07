import AddIcon from '../../assets/icons/kg-add.svg?react';
import AlignCenterIcon from '../../assets/icons/kg-align-center.svg?react';
import AlignJustifyIcon from '../../assets/icons/kg-align-justify.svg?react';
import AlignLeftIcon from '../../assets/icons/kg-align-left.svg?react';
import AlignRightIcon from '../../assets/icons/kg-align-right.svg?react';
import BoldIcon from '../../assets/icons/kg-bold.svg?react';
import EditIcon from '../../assets/icons/kg-edit.svg?react';
import EyeIcon from '../../assets/icons/kg-eye.svg?react';
import HeadingFiveIcon from '../../assets/icons/kg-heading-5.svg?react';
import HeadingFourIcon from '../../assets/icons/kg-heading-4.svg?react';
import HeadingOneIcon from '../../assets/icons/kg-heading-1.svg?react';
import HeadingThreeIcon from '../../assets/icons/kg-heading-3.svg?react';
import HeadingTwoIcon from '../../assets/icons/kg-heading-2.svg?react';
import ImgFullIcon from '../../assets/icons/kg-img-full.svg?react';
import ImgRegularIcon from '../../assets/icons/kg-img-regular.svg?react';
import ImgReplaceIcon from '../../assets/icons/kg-replace.svg?react';
import ImgWideIcon from '../../assets/icons/kg-img-wide.svg?react';
import ItalicIcon from '../../assets/icons/kg-italic.svg?react';
import LinkIcon from '../../assets/icons/kg-link.svg?react';
import QuoteIcon from '../../assets/icons/kg-quote.svg?react';
import QuoteOneIcon from '../../assets/icons/kg-quote-1.svg?react';
import QuoteTwoIcon from '../../assets/icons/kg-quote-2.svg?react';
import SnippetIcon from '../../assets/icons/kg-snippet.svg?react';
import TrashIcon from '../../assets/icons/kg-trash.svg?react';
import WandIcon from '../../assets/icons/kg-wand.svg?react';
import {Tooltip} from './Tooltip';

export const TOOLBAR_ICONS = {
    bold: BoldIcon,
    italic: ItalicIcon,
    headingOne: HeadingOneIcon,
    headingTwo: HeadingTwoIcon,
    headingThree: HeadingThreeIcon,
    headingFour: HeadingFourIcon,
    headingFive: HeadingFiveIcon,
    quote: QuoteIcon,
    quoteOne: QuoteOneIcon,
    quoteTwo: QuoteTwoIcon,
    link: LinkIcon,
    alignLeft: AlignLeftIcon,
    alignCenter: AlignCenterIcon,
    alignRight: AlignRightIcon,
    alignJustify: AlignJustifyIcon,
    imgRegular: ImgRegularIcon,
    imgWide: ImgWideIcon,
    imgFull: ImgFullIcon,
    imgReplace: ImgReplaceIcon,
    add: AddIcon,
    edit: EditIcon,
    wand: WandIcon,
    visibility: EyeIcon,
    snippet: SnippetIcon,
    remove: TrashIcon
};

// a host action with no icon shows the first letters of its label
function LabelIcon({label, className}) {
    return <span aria-hidden="true" className={className} style={{fontSize: '1.2rem', fontWeight: 700, lineHeight: 1}}>{label}</span>;
}

export function ToolbarMenu({children, hide, ...props}) {
    if (hide) {
        return null;
    }

    return (
        <ul className="relative m-0 flex max-w-full flex-wrap items-center justify-evenly gap-1 rounded-lg bg-white px-1 font-sans text-md font-normal text-black shadow-md dark:bg-grey-950 forced-colors:border forced-colors:border-[ButtonText]" {...props}>
            {children}
        </ul>
    );
}

export function ToolbarMenuItem({label, isActive, onClick, icon, CustomIcon, shortcutKeys, secondary, dataTestId, hide, ...props}) {
    if (hide) {
        return null;
    }

    const Icon = CustomIcon || TOOLBAR_ICONS[icon] || LabelIcon;

    return (
        <li className="group relative m-0 flex p-0 first:m-0" {...props}>
            <button
                aria-label={label}
                className={`my-1 flex h-8 w-9 cursor-pointer items-center justify-center rounded-md transition hover:bg-grey-200/80 dark:hover:bg-grey-900 ${isActive ? 'bg-grey-200/80 dark:bg-grey-800 forced-colors:bg-[Highlight]' : 'bg-white dark:bg-grey-950'}`}
                data-kg-active={isActive}
                data-testid={dataTestId}
                type="button"
                onClick={onClick}
            >
                <Icon {...(Icon === LabelIcon ? {label: String(label || '').slice(0, 2)} : {})} className={`size-4 overflow-visible transition ${secondary ? 'stroke-2' : 'stroke-[2.5]'} ${isActive ? 'text-selection dark:text-selection forced-colors:text-[HighlightText]' : 'text-black dark:text-white forced-colors:text-[ButtonText]'}`} />
            </button>
            <Tooltip label={label} shortcutKeys={shortcutKeys} />
        </li>
    );
}

export function ToolbarMenuSeparator({hide}) {
    if (hide) {
        return null;
    }

    return (
        <li className="m-0 w-px self-stretch bg-grey-300/80 dark:bg-grey-900"></li>
    );
}

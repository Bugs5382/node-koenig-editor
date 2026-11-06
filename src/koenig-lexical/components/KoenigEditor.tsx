import KoenigComposableEditor from './KoenigComposableEditor';
import {KoenigPreviewBar} from '../../additions/preview/PreviewBar';
import {KoenigPreviewFrame} from '../../additions/preview/PreviewFrame';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import {SharedHistoryContext} from '../context/SharedHistoryContext';
import {SharedOnChangeContext} from '../context/SharedOnChangeContext';

const KoenigEditor = ({
    onChange,
    children,
    ...props
}) => {
    return (
        <SharedHistoryContext>
            <SharedOnChangeContext onChange={onChange}>
                <KoenigPreviewBar />
                <KoenigPreviewFrame>
                    <KoenigComposableEditor {...props}>
                        <AllDefaultPlugins />
                        {children}
                    </KoenigComposableEditor>
                </KoenigPreviewFrame>
            </SharedOnChangeContext>
        </SharedHistoryContext>
    );
};

export default KoenigEditor;

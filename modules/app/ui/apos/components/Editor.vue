<template>
  <div v-if="editor" class="container">
    <div class="controls">
      <span class="control-group">
        <Select class="block-type" v-model="blockType" @user-change="changeBlockType" :empty="false" :choices="toChoices(blockTypes)" />
      </span>
      <span class="control-group" v-for="buttons in buttonGroups">
        <Component :is="getButtonType(button)" v-for="button in buttons" :key="button" @click="(arg) => enact(button, arg)" :disabled="isDisabled(button)" :class="{ 'is-active': isActive(button) }">
          <Component :is="icons[button]" :title="labels[button]" />
        </Component>
      </span>
    </div>
    <editor-content class="content" :editor="editor" />
  </div>
</template>

<script setup>
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import Select from './Select.vue';
import AttachmentButton from './AttachmentButton.vue';
import { Editor, EditorContent } from '@tiptap/vue-3'
import { ref, onBeforeUnmount, watch } from 'vue';
import FormatBold from 'vue-material-design-icons/FormatBold.vue';
import FormatItalic from 'vue-material-design-icons/FormatItalic.vue';
import FormatStrikethrough from 'vue-material-design-icons/FormatStrikethrough.vue';
import CodeBraces from 'vue-material-design-icons/CodeBraces.vue';
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue';
import FormatListNumbered from 'vue-material-design-icons/FormatListNumbered.vue';
import CodeBracesBox from 'vue-material-design-icons/CodeBlockTags.vue';
import FormatBlockquote from 'vue-material-design-icons/FormatQuoteOpen.vue';
import AttachmentIcon from 'vue-material-design-icons/Attachment.vue';
import Attachment from '../lib/tiptap-extensions/Attachment.js';

const model = defineModel();

const editor = ref(new Editor({
  extensions: [
    TextStyle.configure({ types: [ListItem.name] }),
    StarterKit,
    Attachment()
  ],
  content: model.value,
  onUpdate: () => {
    model.value = editor.value.getHTML();
  }
}));

const blockType = ref('paragraph');

const blockTypes = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4'
];

const buttonGroups = [
  [
    'bold',
    'italic',
    'strike',
    'code'
  ],
  [
    'bulletList',
    'orderedList',
    'codeBlock',
    'blockquote'
  ],
  [
    'attachment'
  ]
];

const icons = {
  bold: FormatBold,
  italic: FormatItalic,
  strike: FormatStrikethrough,
  code: CodeBraces,
  bulletList: FormatListBulleted,
  orderedList: FormatListNumbered,
  codeBlock: CodeBracesBox,
  blockquote: FormatBlockquote,
  attachment: AttachmentIcon
};

const labels = {
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  heading4: 'Heading 4',
  bulletList: 'Bulleted List',
  orderedList: 'Numbered List',
  codeBlock: 'Code Block',
  blockquote: 'Block Quote',
  bold: 'Bold',
  italic: 'Italic',
  strike: 'Strikethrough',
  code: 'Code'
};

const setters = {
  paragraph: 'setParagraph',
  attachment: 'setAttachment'
};

const argHandlers = {
  attachment(attachment) {
    return {
      url: attachment?._urls?.max || attachment._url
    };
  }
};

function changeBlockType() {
  enact(blockType.value || blockTypes[0]);
}

watch(() => {
  // This filter intentionally runs over everything, not just the
  // first match, to make sure we are reactively monitoring
  // all of the choices for next time
  return blockTypes.map(parse)
    .filter(({ name, tool, args }) =>
      editor.value.isActive(tool, args)
    );
}, active => {
  const newBlockType = active[0]?.name || blockTypes[0].name;
  if (newBlockType !== blockType.value) {
    blockType.value = newBlockType;
    editor.value.commands.focus();
  }
});

function isActive(name) {
  const { tool, args } = parse(name);
  return editor.value.isActive(tool, args);
}

function isDisabled(name) {
  return !enactOn(editor.value.can(), name);
}

function enact(name, arg) {
  return enactOn(editor.value, name, arg);
}

function enactOn(context, name, arg) {
  const { method, args } = parse(name, arg);
  return context.chain().focus()[method](args).run();
}

function parse(name, arg = null) {
  const matches = name.match(/^(\w+?)(\d*)$/);
  const tool = matches[1];
  const level = matches[2] && parseInt(matches[2]);
  const method = setters[tool] || `toggle${capFirst(tool)}`;
  const argHandler = arg && argHandlers[name];
  const args = (argHandler && argHandler(arg)) || {};
  if (level) {
    args.level = level;
  }
  return {
    name,
    tool,
    method,
    args,
    label: labels[name]
  };
}

function toChoices(values) {
  return values.map(value => ({
    value,
    label: labels[value]
  }));
}

function capFirst(s) {
  return s.substring(0, 1).toUpperCase() + s.substring(1);
}

function getButtonType(button) {
  if (button === 'attachment') {
    return AttachmentButton;
  } else {
    return 'button';
  }
}

function insertFile(file) {

}

onBeforeUnmount(() => {
  editor.value.destroy();
});
</script>

<style lang="scss" scoped>

@import 'vue-material-design-icons/styles';

.container {
  min-height: 400px;
  max-height: 80%;
  width: 560px;
}
.content {
  width: 100%;
}
.controls {
  label, button {
    all: unset;
    outline: revert;
    margin-left: 2px;
    margin-right: 2px;
  }
  label, button {
    .is-active {
      background-color: #def;
    }
  }
  .block-type {
    transform: translate(0, -8px);
  }
}

.control-group {
  margin-right: 12px;
}

/* Basic editor styles */
:deep(.tiptap) {
  width: 560px;
  height: 60vh;
  overflow: auto;
  border: 1px solid #767676;
  box-sizing: border-box;

  :first-child {
    margin-top: 0;
  }

  /* List styles */
  ul,
  ol {
    padding: 0 1rem;
    margin: 1.25rem 1rem 1.25rem 0.4rem;

    li p {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }
  }

  /* Heading styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.1;
    margin-top: 2.5rem;
    text-wrap: pretty;
  }

  h1,
  h2 {
    margin-top: 3.5rem;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.4rem;
  }

  h2 {
    font-size: 1.2rem;
  }

  h3 {
    font-size: 1.1rem;
  }

  h4,
  h5,
  h6 {
    font-size: 1rem;
  }

  /* Code and preformatted text styles */
  code {
    background-color: var(--purple-light);
    border-radius: 0.4rem;
    color: var(--black);
    font-size: 0.85rem;
    padding: 0.25em 0.3em;
  }

  pre {
    background: var(--black);
    border-radius: 0.5rem;
    color: var(--white);
    font-family: 'JetBrainsMono', monospace;
    margin: 1.5rem 0;
    padding: 0.75rem 1rem;

    code {
      background: none;
      color: inherit;
      font-size: 0.8rem;
      padding: 0;
    }
  }

  blockquote {
    border-left: 3px solid var(--gray-3);
    margin: 1.5rem 0;
    padding-left: 1rem;
  }

  hr {
    border: none;
    border-top: 1px solid var(--gray-2);
    margin: 2rem 0;
  }

  figure.ProseMirror-selectednode {
    opacity: 50%;
    filter: hue-rotate(45deg);
  }

  // Inline image styles
  img {
    display: block;
    max-width: 100%;
  }
}
</style>

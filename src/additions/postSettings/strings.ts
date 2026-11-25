/*
MIT License

Copyright (c) 2026 Shane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
/** The wording of the post settings menu. A host passes any part of it as `strings`. */
export interface PostSettingsStrings {
  button: string;
  title: string;
  displayTitle: string;
  displayTitlePlaceholder: string;
  displayTitleHint: string;
  displaySubtitle: string;
  displaySubtitlePlaceholder: string;
  displaySubtitleHint: string;
  featuredImage: string;
  featuredImageHint: string;
  noFeaturedImage: string;
  noImages: string;
  missingImage: string;
  removeFeaturedImage: string;
  imageWithoutAlt: string;
  topics: string;
  topicsHint: string;
  topicsLimit: string;
  noTopics: string;
  removeTopic: string;
}

export const DEFAULT_POST_SETTINGS_STRINGS: PostSettingsStrings = {
  button: "Post settings",
  title: "Post settings",
  displayTitle: "Display title",
  displayTitlePlaceholder: "Add a custom title...",
  displayTitleHint:
    "Shown in lists, previews and when shared. Leave it empty to use the story's own title.",
  displaySubtitle: "Display subtitle",
  displaySubtitlePlaceholder: "Add a custom subtitle...",
  displaySubtitleHint:
    "Shown in lists, previews and when shared. Leave it empty to use the story's own subtitle.",
  featuredImage: "Featured image",
  featuredImageHint: "Pick one of the images in your story.",
  noFeaturedImage: "No featured image",
  noImages: "Add an image to the story first.",
  missingImage: "The image you picked is no longer in the story.",
  removeFeaturedImage: "Remove",
  imageWithoutAlt: "Image without a description",
  topics: "Topics",
  topicsHint: "Choose up to {max}.",
  topicsLimit: "You can choose up to {max} topics.",
  noTopics: "There are no topics to choose from.",
  removeTopic: "Remove {topic}",
};

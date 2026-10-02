import {CogIcon} from '@sanity/icons/Cog'
import {CommentIcon} from '@sanity/icons/Comment'
import {DashboardIcon} from '@sanity/icons/Dashboard'
import {LinkIcon} from '@sanity/icons/Link'
import {TagIcon} from '@sanity/icons/Tag'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'
import type {DefaultDocumentNodeResolver, StructureResolver} from 'sanity/structure'
import {ConceptEvolutionView} from './components/views/ConceptEvolutionView'
import {LinkContextView} from './components/views/LinkContextView'
import {PaperLineageView} from './components/views/PaperLineageView'
import {PaperSourceView} from './components/views/PaperSourceView'

const linksBy = (S: Parameters<StructureResolver>[0], title: string, filter: string) =>
  S.listItem()
    .title(title)
    .child(S.documentList().title(title).filter(`_type == "influence" && ${filter}`).defaultOrdering([{field: 'citation.mentions', direction: 'desc'}]))

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Paper Lineage')
    .items([
      S.listItem()
        .title('Papers')
        .child(
          S.list()
            .title('Papers')
            .items([
              S.listItem().title('All papers').child(S.documentTypeList('paper').title('All papers').defaultOrdering([{field: 'publishedAt', direction: 'desc'}])),
              ...['method', 'dataset', 'benchmark', 'analysis'].map((kind) =>
                S.listItem()
                  .title(`${kind[0].toUpperCase()}${kind.slice(1)}s`)
                  .child(S.documentList().title(kind).filter('_type == "paper" && kind == $kind').params({kind})),
              ),
            ]),
        ),
      S.listItem()
        .title('Lineage links')
        .icon(LinkIcon)
        .child(
          S.list()
            .title('Lineage links')
            .items([
              linksBy(S, 'Unreviewed', 'provenance.reviewDecision == "proposed"'),
              linksBy(S, 'Unreviewed · cited in Method', 'provenance.reviewDecision == "proposed" && citation.methodMentions > 0'),
              linksBy(S, 'Verified', 'provenance.reviewDecision == "accepted"'),
              linksBy(S, 'Rejected', 'provenance.reviewDecision == "rejected"'),
              S.divider(),
              linksBy(S, 'All links', 'true'),
            ]),
        ),
      S.listItem()
        .title('Concepts')
        .icon(TagIcon)
        .child(
          S.documentList()
            .title('Themes')
            .filter('_type == "concept" && level == "theme"')
            .child((themeId) =>
              S.documentList().title('Concepts in theme').filter('_type == "concept" && broader._ref == $themeId').params({themeId}),
            ),
        ),
      S.documentTypeListItem('storyline').title('Storylines'),
      S.divider(),
      S.listItem()
        .title('Questions & gaps')
        .icon(CommentIcon)
        .child(
          S.list()
            .title('Questions & gaps')
            .items([
              S.listItem().title('Open gaps').icon(WarningOutlineIcon).child(S.documentList().title('Open gaps').filter('_type == "gap" && status in ["open", "in-progress"]')),
              S.listItem().title('Unanswered questions').child(S.documentList().title('Unanswered').filter('_type == "question" && outcome != "answered"')),
              S.documentTypeListItem('question').title('All questions'),
              S.documentTypeListItem('gap').title('All gaps'),
            ]),
        ),
      S.documentTypeListItem('paperText').title('Full texts'),
      S.divider(),
      S.listItem().title('Dataset stats').icon(DashboardIcon).child(S.document().schemaType('datasetStats').documentId('datasetStats')),
      S.listItem().title('Site settings').icon(CogIcon).child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ])

// Extra tabs next to the form (DESIGN_SPEC §10.1): curators read lineage and source without leaving the document.
export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, {schemaType}) => {
  switch (schemaType) {
    case 'paper':
      return S.document().views([
        S.view.form(),
        S.view.component(PaperLineageView).title('Lineage'),
        S.view.component(PaperSourceView).title('Source'),
      ])
    case 'influence':
      return S.document().views([S.view.form(), S.view.component(LinkContextView).title('In context')])
    case 'concept':
      return S.document().views([S.view.form(), S.view.component(ConceptEvolutionView).title('Evolution')])
    default:
      return S.document().views([S.view.form()])
  }
}

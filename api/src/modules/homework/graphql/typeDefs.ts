import { gql } from "graphql-tag";

// Every type and operation is prefixed with the plugin name: the gateway
// composes all plugins into one supergraph, so names must be unique across it.
export const homeworkTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key"])

  enum HomeworkQuestionType {
    multiple_choice
    short_answer
    calculation
    true_false
    fill_blank
  }

  enum HomeworkDifficulty {
    easy
    medium
    hard
  }

  enum HomeworkSetType {
    in_class
    homework
  }

  enum HomeworkSourceType {
    pdf
    voice
    text
    copied
  }

  enum HomeworkInputSource {
    pdf
    voice
    text
  }

  enum HomeworkVisibility {
    private
    public
  }

  enum HomeworkScope {
    library
    mine
  }

  enum HomeworkSort {
    newest
    copies
    rating
  }

  type HomeworkQuestion {
    id: String!
    type: HomeworkQuestionType!
    prompt: String!
    options: [String!]
    answer: String!
    explanation: String!
    points: Int!
  }

  input HomeworkQuestionInput {
    id: String!
    type: HomeworkQuestionType!
    prompt: String!
    options: [String!]
    answer: String!
    explanation: String!
    points: Int!
  }

  type HomeworkAuthor {
    userId: String!
    fullName: String!
    school: String!
  }

  type HomeworkSet {
    _id: String!
    title: String!
    subject: String!
    grade: Int!
    topic: String!
    curriculumUnit: String
    setType: HomeworkSetType!
    difficulty: HomeworkDifficulty!
    questions: [HomeworkQuestion!]!
    sourceType: HomeworkSourceType!
    copiedFromId: String
    visibility: HomeworkVisibility!
    copyCount: Int!
    ratingCount: Int!
    ratingAverage: Float!
    "The signed-in teacher's own rating, if any."
    myRating: Int
    isOwner: Boolean!
    author: HomeworkAuthor!
    createdAt: String!
    updatedAt: String!
  }

  type HomeworkSetList {
    list: [HomeworkSet!]!
    totalCount: Int!
  }

  input HomeworkSetInput {
    title: String!
    subject: String!
    grade: Int!
    topic: String!
    curriculumUnit: String
    difficulty: HomeworkDifficulty!
    questions: [HomeworkQuestionInput!]!
    visibility: HomeworkVisibility!
  }

  type HomeworkProfile {
    userId: String!
    fullName: String!
    school: String!
    district: String!
    subjects: [String!]!
    grades: [Int!]!
  }

  input HomeworkProfileInput {
    fullName: String!
    school: String!
    district: String!
    subjects: [String!]!
    grades: [Int!]!
  }

  enum HomeworkAiProvider {
    anthropic
    openai
    gemini
    openai_compatible
  }

  input HomeworkAiSettingsInput {
    provider: HomeworkAiProvider!
    model: String!
    baseUrl: String
  }

  input HomeworkAiCredentialsInput {
    settings: HomeworkAiSettingsInput!
    apiKey: String!
  }

  type HomeworkConfig {
    "True when the signed-in teacher has a saved key and encryption is configured."
    aiEnabled: Boolean!
    hasApiKey: Boolean!
    keyStorageEnabled: Boolean!
    provider: HomeworkAiProvider
    baseUrl: String
    supportsPdf: Boolean!
    model: String
    maxPdfBytes: Int!
  }

  input HomeworkGenerationInput {
    subject: String!
    grade: Int!
    topic: String!
    inputText: String
    "Returned by POST /pl:<plugin>/upload on the gateway."
    uploadId: String
    inClassCount: Int!
    homeworkCount: Int!
    difficulty: HomeworkDifficulty!
    sourceType: HomeworkInputSource!
  }

  type HomeworkGenerated {
    title: String!
    topicSummary: String!
    inClass: [HomeworkQuestion!]!
    homework: [HomeworkQuestion!]!
    "Retained for client compatibility; live generation always returns false."
    mocked: Boolean!
  }

  input HomeworkGeneratedInput {
    title: String!
    topicSummary: String!
    inClass: [HomeworkQuestionInput!]!
    homework: [HomeworkQuestionInput!]!
  }

  type HomeworkSaveResult {
    inClassSetId: String!
    homeworkSetId: String!
  }

  type Query {
    homeworkSets(
      scope: HomeworkScope!
      search: String
      subject: String
      grade: Int
      setType: HomeworkSetType
      difficulty: HomeworkDifficulty
      sort: HomeworkSort = newest
      limit: Int = 12
      offset: Int = 0
    ): HomeworkSetList!
    homeworkSet(_id: String!): HomeworkSet!
    homeworkProfile: HomeworkProfile!
    homeworkConfig: HomeworkConfig!
  }

  type Mutation {
    "Save the signed-in teacher's provider, model and key. Null removes the configuration. The key is never returned."
    homeworkAiSettingsSave(input: HomeworkAiCredentialsInput): Boolean!
    homeworkGenerate(input: HomeworkGenerationInput!): HomeworkGenerated!
    "Saves the reviewed in-class and homework sets. Retrying with the same requestId returns the first result."
    homeworkGenerationSave(
      requestId: String!
      input: HomeworkGenerationInput!
      generated: HomeworkGeneratedInput!
      visibility: HomeworkVisibility!
    ): HomeworkSaveResult!
    homeworkSetUpdate(_id: String!, input: HomeworkSetInput!): HomeworkSet!
    homeworkSetRemove(_id: String!): Boolean!
    homeworkSetCopy(_id: String!): HomeworkSet!
    homeworkSetRate(_id: String!, stars: Int!): HomeworkSet!
    homeworkProfileUpdate(input: HomeworkProfileInput!): HomeworkProfile!
  }
`;

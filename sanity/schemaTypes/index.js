import article from './article'
import trending from './trending'
import dealEvent from './dealEvent'
import project from './project'
import post from './post'
import caseStudy from './caseStudy'
import pdfGuide, { pdfGuideObjectTypes } from './pdfGuide'

export const schemaTypes = [article, trending, dealEvent, project, post, caseStudy, pdfGuide, ...pdfGuideObjectTypes]
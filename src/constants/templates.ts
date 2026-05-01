
export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  icon: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting-minutes',
    name: 'Meeting Minutes',
    description: 'Structure for recording meeting discussions and actions.',
    icon: 'Users',
    content: `# Meeting Minutes: [Meeting Title]

**Date:** [Date]
**Attendees:** [List]

## Agenda
- [Item 1]
- [Item 2]

## Key Discussion Points
- 

## Actions / Next Steps
- [ ] @assignee: Action item description
- [ ] 

## Decisions Made
- 
`
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Kickstart a new project with objectives and milestones.',
    icon: 'Target',
    content: `# Project Plan: [Project Name]

## 1. Objectives
- 

## 2. Scope
- 

## 3. Milestones
- [ ] Milestone 1 (Target Date)
- [ ] Milestone 2 (Target Date)

## 4. Resources Needed
- 

## 5. Potential Risks
- 
`
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    description: 'Track your daily thoughts and gratitude.',
    icon: 'BookOpen',
    content: `# Daily Journal: [Date]

## How was my day?
- 

## Top 3 Goals Accomplished
1. 
2. 
3. 

## What am I grateful for?
1. 
2. 
3. 

## Focus for tomorrow
- 
`
  },
  {
    id: 'creative-brief',
    name: 'Creative Brief',
    description: 'Outline requirements for creative projects.',
    icon: 'Palette',
    content: `# Creative Brief: [Project Name]

**Background:** 
**Objective:** 
**Target Audience:** 
**Key Message:** 
**Deliverables:** 
**Budget/Timeline:** 
`
  }
];

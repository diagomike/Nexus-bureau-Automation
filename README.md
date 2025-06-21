--- 

in the creation of workflow templates 
- add the place where excecutioner is set - and workflows only appears to the set executioner user (this means available workflows that appear on dashboard must have the current user as excecutioner set on them)
- - also let it be possible to set excecutioner to entities, not just personnel ( so if it is set to entity - any personnel of the entity can start and excecute it. ) [so, available workflows for any personnel would be those set for him personnally and those set for the entity he is appart of as a whole]
- this can be implemented by a dropdown that contains all personnel of current entity and then also a button for global search could also be implemented - which loads a modal interactions where one can search and filter all public entities (not- personnel - for global reachables we can only set tasks to entities) [in the land giving to lecturers initiative example - the government land office would just set the initiative filling workflow to the university and those who fullfill the requirements would start it!] 

in milestone approver selection 
- rather than just a dropdown of all entities within the system showing up,
- let the entities who have this current entity as their parent show up in the dropdown
- then have a tiny button next to the dropdown with some global search looking Icon - which when clicked loads a modal interaction in which the all entities that are public are queried from storage and the user can search and filter them to acctually select the entity he wants and loads it from there

---

in entity management tab 
- only decendant entities of the current entity should appear in Entity management tab - those are the only ones the manager of the entity should have previledges to manage
- and rather than them just being cards - show their hierachical structure by having some kind of tree or timeline structure to show entity tree

--- 
same with personnel management 
- only personnel of current entity and decendant entities should be accessible to manage by a given entity manager




--------

Enhance the workflow template creation process to include the following features:

1.  **Executioner Assignment:**
    *   Implement a mechanism to assign an executioner to each workflow template.
    *   Workflows should only be visible and accessible to the assigned executioner (or members of the assigned entity).

2.  **Executioner Options:**
    *   Provide a dropdown to select personnel within the current user's entity as executioners.
    *   Allow the assignment of entities as executioners. If an entity is selected, any personnel associated with that entity can initiate and execute the workflow.

3.  **Global Entity Search:**
    *   Include a button next to excecutioner options dropdown to trigger a modal for searching and filtering public entities.
    *   This modal should enable users to search for and select entities to be assigned as executioners (for cross entity collaboration).

Ensure that the available workflows displayed on the dashboard are filtered based on the current user's executioner assignments (either directly to the user or to an entity the user belongs to).
[in the land giving to lecturers initiative example - the government land office would just set the initiative filling workflow to the university and only univerisity personnel could access it!] 


Enhance the milestone approver selection process. Instead of displaying a dropdown of all entities, populate the dropdown with only those entities that are direct descendants of the current entity. Implement an advanced search functionality using a global search icon next to the dropdown. Clicking the icon should open a modal. Within the modal, allow users to search and filter all public entities to select the desired approver entity. Integrate the selected entity into the milestone approver selection. 

In the entity management tab, restrict the display to descendant entities of the current entity only. Present these entities in a hierarchical tree or timeline structure to visualize the entity tree. Similarly, in personnel management, limit the accessible personnel to those associated with the current entity and its descendants, ensuring that entity managers can only manage personnel within their hierarchical scope.

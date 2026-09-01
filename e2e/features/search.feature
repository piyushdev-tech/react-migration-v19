Feature: Search Box Component
  As a user
  I want to use the search box to filter items
  So that I can find what I'm looking for quickly

  Scenario: Search box is visible and empty by default
    Given the user navigates to the home page
    When the page loads
    Then the search box should be visible
    And the search box should be empty

  Scenario: User can type in the search box
    Given the user navigates to the home page
    When the user types "test" in the search box
    Then the search box should contain "test"

  Scenario: Search results are filtered
    Given the user navigates to the home page
    And there are multiple items displayed
    When the user searches for a specific item
    Then only matching items should be displayed

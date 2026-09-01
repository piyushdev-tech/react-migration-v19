Feature: Counter Component
  As a user
  I want to interact with a counter component
  So that I can increase and decrease the counter value

  Scenario: User can see initial counter value
    Given the user navigates to the home page
    When the counter component is visible
    Then the counter should display an initial value of 0

  Scenario: User can increment the counter
    Given the user navigates to the home page
    And the counter is displayed
    When the user clicks the increment button
    Then the counter value should increase by 1

  Scenario: User can decrement the counter
    Given the user navigates to the home page
    And the counter is displayed
    When the user clicks the decrement button
    Then the counter value should decrease by 1

  Scenario: Multiple increments work correctly
    Given the user navigates to the home page
    And the counter is at 0
    When the user clicks the increment button 5 times
    Then the counter value should be 5

#!/bin/bash

SERVER_URL=http://localhost:6969
NUM_TESTS=0
NUM_PASSED=0

perform_test() {
    local test_name="$1"
    local expected_response="$2"
    local response

    response=$(curl -s -X "$3" -H 'Content-Type: application/json' -d "$4" "$SERVER_URL$5")

    NUM_TESTS=$((NUM_TESTS+1))

    printf "\n=====================================================\n"
    printf "Test: %s\n" "$test_name"
    printf -- "-----------------------------------------------------\n"
    printf "Expected Response: %s\n" "$expected_response"
    printf -- "-----------------------------------------------------\n"
    printf "Actual Response: %s\n" "$response"
    printf "=====================================================\n"

    if [[ "$response" == *"$expected_response"* ]]; then
        printf "\033[1;32m%s\033[0m\n" "Test Passed!"
        NUM_PASSED=$((NUM_PASSED+1))
    else
        printf "\033[1;31m%s\033[0m\n" "Test Failed!"
    fi
}

# Utility
post_random_test_business() {
    curl -s -X POST $SERVER_URL/businesses \
    -H "Content-Type: application/json" \
    -d '{
        "ownerid": "123",
        "name": "Test Business",
        "address": "123 Main St",
        "city": "Test City",
        "state": "TS",
        "zip": "12345",
        "phone": "555-1234",
        "category": "Test Category",
        "subcategory": "Test Subcategory",
        "website": "http://testbusiness.com",
        "email": "test@testbusiness.com"
    }' >> /dev/null
}


# Test: POST a new business
test_post_business() {
    local test_name="POST a new business"
    local expected_response='"id":"0","links":{"business":"/businesses/0"}'
    local method="POST"
    local data='{"_id":"0", "ownerid":"0", "name":"Bobs Burgers", "city":"Bobtown", "state":"PN", "zip":"12700", "address":"420", "phone":"867-5309", "category":"burgerstand", "subcategory":"with_fries"}'

    perform_test "$test_name" "$expected_response" "$method" "$data" "/businesses/"
}

# Test: fail to POST a business without name or zip
test_fail_post_business() {
    local test_name="Fail to POST a new business without name or zip"
    local expected_response='"error":"Request body is not a valid business object"'
    local method="POST"
    local data='{"city":"Bobtown", "state":"PN", "address":"420", "phone":"867-5309", "category":"burgerstand", "subcategory":"with_fries"}'
    perform_test "$test_name" "$expected_response" "$method" "$data" "/businesses/"
}

# Test: GET a business
test_get_a_business() {
  local test_name="GET a business"
  local expected_response='"_id":"0","ownerid":"0","name":"Bobs Burgers","address":"420","city":"Bobtown","state":"PN","zip":"12700","phone":"867-5309","category":"burgerstand","subcategory":"with_fries"'
  local method="GET"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/businesses/0"
}

# Test: GET businesses
test_get_businesses() {
    local test_name="GET businesses"
    local expected_response=''
    local method="GET"
    local data=''

    for (( i = 0; i < 19; i++ )); do
      post_random_test_business
    done

    perform_test "$test_name" "$expected_response" "$method" "$data" "/businesses?page=2"
}

# Test: PUT an updated business
test_put_an_updated_business() {
    local test_name="PUT an updated business"
    local expected_response='"links":{"business":"/businesses/0"}'
    local method="PUT"
    local data='{"_id":"0", "ownerid":"0", "name":"Jimmy Pestoffed", "city":"Bobtown", "state":"PN", "zip":"12700", "address":"420", "phone":"867-5309", "category":"burgerstand", "subcategory":"with_fries"}'

    perform_test "$test_name" "$expected_response" "$method" "$data" "/businesses/0"
}

# Test: DELETE a business
test_delete_a_business() {
  local test_name="DELETE a business"
  local expected_response=''
  local method="DELETE"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/businesses/0"
}


# Test: POST a review
test_post_a_review() {
  local test_name="POST a review"
  local expected_response='"id":"0","links":{"review":"/reviews/0","business":"/businesses/0"}'
  local method="POST"
  local data='{"_id":"0", "userid":"0", "businessid":"0", "dollars":15, "stars":472, "review":"WOuld give more stars if i culd"}'

  perform_test "$test_name" "$expected_response" "$method" "$data" "/reviews/"
}

# Test: GET a review
test_get_a_review() {
  local test_name="GET a review"
  local expected_response='"_id":"0","userid":"0","businessid":"0","dollars":15,"stars":0,"review":"Actually this place sucks"'
  local method="GET"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/reviews/0"
}

# Test: PUT an upated review
test_put_an_updated_review() {
  local test_name="PUT an updated review"
  local expected_response='{"links":{"review":"/reviews/0","business":"/businesses/0"}}'
  local method="PUT"
  local data='{"_id":"0", "userid":"0", "businessid":"0", "dollars":15, "stars":0, "review":"Actually this place sucks"}'

  perform_test "$test_name" "$expected_response" "$method" "$data" "/reviews/0"
}

# Test: DELETE a review
test_delete_a_review() {
  local test_name="DELETE a review"
  local expected_response=''
  local method="DELETE"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/reviews/0"
}


# Test: POST a photo
test_post_a_photo() {
  local test_name="POST a photo"
  local expected_response='"id":"0","links":{"photo":"0","business":"/businesses/0"}'
  local method="POST"
  local data='{"_id":"0", "userid":"0", "businessid":"0"}'

  perform_test "$test_name" "$expected_response" "$method" "$data" "/photos/"
}

# Test: GET a photo
test_get_a_photo() {
  local test_name="GET a photo"
  local expected_response='{"_id":"0","userid":"0","businessid":"0","caption":"me and boys eating burgers"}'
  local method="GET"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/photos/0"
}

# Test: POST a photo
test_put_a_photo() {
  local test_name="PUT a photo"
  local expected_response='"links":{"photo":"/photos/0","business":"/businesses/0"}}'
  local method="PUT"
  local data='{"_id":"0", "userid":"0", "businessid":"0", "caption":"me and boys eating burgers"}'

  perform_test "$test_name" "$expected_response" "$method" "$data" "/photos/0"
}

# Test: DELETE a photo
test_delete_a_photo() {
  local test_name="DELETE a photo"
  local expected_response=''
  local method="DELETE"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/photos/0"
}


# Test: GET a user's businesses
test_get_a_users_businesses() {
  local test_name="GET a user's businesses"
  local expected_response=''
  local method="GET"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/users/0/businesses"
}

# Test: GET a user's reviews
test_get_a_users_reviews() {
  local test_name="GET a user's reviews"
  local expected_response=''
  local method="GET"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/users/0/reviews"
}

# Test: GET a user's photos
test_get_a_users_photos() {
  local test_name="GET a user's photos"
  local expected_response=''
  local method="GET"
  local data=''

  perform_test "$test_name" "$expected_response" "$method" "$data" "/users/0/photos"
}

# Run tests
test_post_business
test_fail_post_business
test_get_businesses
test_get_a_business
test_put_an_updated_business

test_post_a_review
test_put_an_updated_review
test_get_a_review

test_post_a_photo
test_put_a_photo
test_get_a_photo

test_get_a_users_businesses
test_get_a_users_reviews
test_get_a_users_photos

test_delete_a_business
test_delete_a_review
test_delete_a_photo



printf "\n=====================================================\n"
printf "Summary:\n"
printf -- "-----------------------------------------------------\n"
printf "Total tests: %d\n" "$((NUM_TESTS))"
printf "Passed: %d\n" "$((NUM_PASSED))"
printf "Failed: %d\n" "$((NUM_TESTS - NUM_PASSED))"
printf "=====================================================\n"
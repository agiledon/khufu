# Spec Changelog

## v1 (2026-06-25)

### Added
- UT-USER-001: shouldCreateUser_whenValidInputGiven (happy-path)
- UT-USER-002: shouldThrowException_whenDuplicateEmail (error-path, fragile)
- UT-USER-003: shouldThrowValidationException_whenNameIsEmpty (planned)
- IT-USER-001: shouldPersistUserToDatabase (persistence)
- IT-USER-002: shouldRollbackOnDuplicateEmail (transaction, planned)
- API-USER-001: shouldReturn201_whenValidUserPosted (planned)
- API-USER-002: shouldReturn422_whenEmailMissing (planned)
- E2E-USER-001: userCanRegisterAndLogin (planned)

### Evaluation Criteria Established
- Correctness, Robustness, Performance, Coverage, Maintainability dimensions defined
- Initial thresholds set: line ≥85%, branch ≥75%, UT <100ms, IT <2s (H2), Fragile ≤20%

-- Fix denormalized link_url columns (add trailing slashes)
UPDATE ec_services SET link_url = '/audiology-services/hearing-tests/' WHERE id = '01KRECGSSC525JMB3SR8Q4A7EJ';
UPDATE ec_services SET link_url = '/audiology-services/sensorineural-hearing-loss/' WHERE id = '01KRECGSSDMCPC3R5NSN7QH29M';
UPDATE ec_services SET link_url = '/audiology-services/ear-wax-removal/' WHERE id = '01KRECGSSDYW50R55451B9S1M5';
UPDATE ec_services SET link_url = '/audiology-services/tinnitus-evaluation-treatment/' WHERE id = '01KRECGSSE6FDTVVNN2G7ETG6R';
UPDATE ec_hearing_aids SET link_url = '/audiology-services/hearing-aid-services/' WHERE id = '01KRECGSSFBS2ZY34FVYJQM76R';
UPDATE ec_hearing_aids SET link_url = '/audiology-services/hearing-aid-fittings/' WHERE id = '01KRECGSSGT4D3PR3MWE3WM268';
UPDATE ec_hearing_aids SET link_url = '/audiology-services/hearing-aid-services/' WHERE id = '01KRECGSSG6NJSNWQH3SD410T6';
UPDATE ec_hearing_aids SET link_url = '/hearing-aids-products/hearing-aid-batteries/' WHERE id = '01KRECGSSHNN4CYY7HD94XB044';

-- Fix revision JSON data (was stale /services and /hearing-aids)
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/hearing-tests/') WHERE id = '01KRECGSSCHD2PK5YX3YMM0DBQ';
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/sensorineural-hearing-loss/') WHERE id = '01KRECGSSDAHFTKJM8KND2HDP5';
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/ear-wax-removal/') WHERE id = '01KRECGSSEP6FBDG86QC6JVJ29';
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/tinnitus-evaluation-treatment/') WHERE id = '01KRECGSSFQP25GP5N5EDTZC23';
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/hearing-aid-services/') WHERE id = '01KRECGSSFQP25GP5N5EDTZC24';
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/hearing-aid-fittings/') WHERE id = '01KRECGSSGSMJQER96Q44SVHV1';
UPDATE revisions SET data = json_set(data, '$.link_url', '/audiology-services/hearing-aid-services/') WHERE id = '01KRECGSSGSMJQER96Q44SVHV2';
UPDATE revisions SET data = json_set(data, '$.link_url', '/hearing-aids-products/hearing-aid-batteries/') WHERE id = '01KRECGSSHE8P88Z79R799KKJG';

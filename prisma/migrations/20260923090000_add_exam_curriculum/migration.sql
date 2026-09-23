-- Exam curriculum for onboarding
-- Idempotent: existing courses/subjects/topics are preserved.

DO $$
DECLARE
  jee_course_id TEXT;
  neet_course_id TEXT;
  college_course_id TEXT;
  subject_id TEXT;
BEGIN

  -- JEE course
  SELECT "id" INTO jee_course_id
  FROM "Course"
  WHERE "examGoal" = 'JEE'
  ORDER BY "createdAt"
  LIMIT 1;

  IF jee_course_id IS NULL THEN
    jee_course_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Course"
      ("id","title","description","examGoal","createdAt","updatedAt")
    VALUES
      (jee_course_id,'JEE Preparation','Core JEE subjects and topics','JEE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  END IF;

  -- JEE Mathematics
  SELECT "id" INTO subject_id FROM "Subject"
  WHERE "courseId" = jee_course_id AND lower("name") = 'mathematics' LIMIT 1;

  IF subject_id IS NULL THEN
    subject_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Subject" ("id","courseId","name","order")
    VALUES (subject_id,jee_course_id,'Mathematics',1);
  END IF;

  INSERT INTO "Topic" ("id","subjectId","name","order","createdAt")
  SELECT md5(random()::text || clock_timestamp()::text),subject_id,v.name,v.ord,CURRENT_TIMESTAMP
  FROM (VALUES
    ('Algebra',1),('Trigonometry',2),('Coordinate Geometry',3),
    ('Differential Calculus',4),('Integral Calculus',5),
    ('Vectors & 3D Geometry',6),('Probability & Statistics',7)
  ) AS v(name,ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM "Topic" t
    WHERE t."subjectId"=subject_id AND lower(t."name")=lower(v.name)
  );

  -- JEE Physics
  SELECT "id" INTO subject_id FROM "Subject"
  WHERE "courseId"=jee_course_id AND lower("name")='physics' LIMIT 1;

  IF subject_id IS NULL THEN
    subject_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Subject" ("id","courseId","name","order")
    VALUES (subject_id,jee_course_id,'Physics',2);
  END IF;

  INSERT INTO "Topic" ("id","subjectId","name","order","createdAt")
  SELECT md5(random()::text || clock_timestamp()::text),subject_id,v.name,v.ord,CURRENT_TIMESTAMP
  FROM (VALUES
    ('Units & Measurements',1),('Kinematics',2),('Laws of Motion',3),
    ('Work, Energy & Power',4),('Rotational Motion',5),
    ('Thermodynamics',6),('Electrostatics',7),('Current Electricity',8),
    ('Magnetism',9),('Optics',10),('Modern Physics',11)
  ) AS v(name,ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM "Topic" t
    WHERE t."subjectId"=subject_id AND lower(t."name")=lower(v.name)
  );

  -- JEE Chemistry
  SELECT "id" INTO subject_id FROM "Subject"
  WHERE "courseId"=jee_course_id AND lower("name")='chemistry' LIMIT 1;

  IF subject_id IS NULL THEN
    subject_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Subject" ("id","courseId","name","order")
    VALUES (subject_id,jee_course_id,'Chemistry',3);
  END IF;

  INSERT INTO "Topic" ("id","subjectId","name","order","createdAt")
  SELECT md5(random()::text || clock_timestamp()::text),subject_id,v.name,v.ord,CURRENT_TIMESTAMP
  FROM (VALUES
    ('Some Basic Concepts of Chemistry',1),('Atomic Structure',2),
    ('Chemical Bonding',3),('Thermodynamics',4),('Equilibrium',5),
    ('Electrochemistry',6),('Chemical Kinetics',7),
    ('Organic Chemistry Basics',8),('Hydrocarbons',9),
    ('Coordination Compounds',10)
  ) AS v(name,ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM "Topic" t
    WHERE t."subjectId"=subject_id AND lower(t."name")=lower(v.name)
  );

  -- NEET course
  SELECT "id" INTO neet_course_id
  FROM "Course"
  WHERE "examGoal"='NEET'
  ORDER BY "createdAt"
  LIMIT 1;

  IF neet_course_id IS NULL THEN
    neet_course_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Course"
      ("id","title","description","examGoal","createdAt","updatedAt")
    VALUES
      (neet_course_id,'NEET Preparation','Core NEET subjects and topics','NEET',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  END IF;

  -- NEET Physics
  SELECT "id" INTO subject_id FROM "Subject"
  WHERE "courseId"=neet_course_id AND lower("name")='physics' LIMIT 1;

  IF subject_id IS NULL THEN
    subject_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Subject" ("id","courseId","name","order")
    VALUES (subject_id,neet_course_id,'Physics',1);
  END IF;

  -- NEET Chemistry
  SELECT "id" INTO subject_id FROM "Subject"
  WHERE "courseId"=neet_course_id AND lower("name")='chemistry' LIMIT 1;

  IF subject_id IS NULL THEN
    subject_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Subject" ("id","courseId","name","order")
    VALUES (subject_id,neet_course_id,'Chemistry',2);
  END IF;

  -- NEET Biology
  SELECT "id" INTO subject_id FROM "Subject"
  WHERE "courseId"=neet_course_id AND lower("name")='biology' LIMIT 1;

  IF subject_id IS NULL THEN
    subject_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Subject" ("id","courseId","name","order")
    VALUES (subject_id,neet_course_id,'Biology',3);
  END IF;

  -- B.Tech / College course
  SELECT "id" INTO college_course_id
  FROM "Course"
  WHERE "examGoal"='College'
  ORDER BY "createdAt"
  LIMIT 1;

  IF college_course_id IS NULL THEN
    college_course_id := md5(random()::text || clock_timestamp()::text);
    INSERT INTO "Course"
      ("id","title","description","examGoal","createdAt","updatedAt")
    VALUES
      (college_course_id,'B.Tech Computer Engineering','Core computer engineering subjects','College',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  END IF;

  -- College subjects
  INSERT INTO "Subject" ("id","courseId","name","order")
  SELECT md5(random()::text || clock_timestamp()::text),college_course_id,v.name,v.ord
  FROM (VALUES
    ('Programming',1),
    ('Data Structures & Algorithms',2),
    ('Discrete Mathematics',3),
    ('Database Management Systems',4),
    ('Operating Systems',5),
    ('Computer Networks',6)
  ) AS v(name,ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM "Subject" s
    WHERE s."courseId"=college_course_id AND lower(s."name")=lower(v.name)
  );

END $$;

//declare Inputs
//lower case a0, d1 is not defined. d0 is not defined.
int valA0;
int valA1;
int valD0;

int sumA0 = 0;
int sumA1 = 0;
int sumD0 = 0;
int aveA0 = 0;
int aveA1 = 0;
int aveD0 = 0;

int counter = 0;

void setup() {
  //pin mode OUTPUT data or energy out
  pinMode(1, OUTPUT);
  pinMode(5, OUTPUT);
  pinMode(9, OUTPUT);

  //pin mode INPUT data or energy in
  pinMode(A0, INPUT);
  pinMode(A1, INPUT);
  pinMode(0, INPUT);

  Serial.begin(9600);
}

void loop() {
  //get Inputs
  //lower case a0, d1 is not defined. d0 is not defined.
  valA0 = analogRead(A0);
  valA1 = analogRead(A1);
  valD0 = digitalRead(0);

  //interact with world
  //scale the values for the proper OUTPUT
  //do not have to scale digital INPUT D0
  int mapA0 = map(valA0, 0, 1023, 0, 255);
  int mapA1 = map(valA1, 0, 1023, 0, 255);

  //send Outputs
  digitalWrite(1, valD0);
  analogWrite(5, mapA0);
  analogWrite(9, mapA1);

  counter++;

  sumA0 += valA0;
  sumA1 += valA1;
  sumD0 += valD0;

  if (50 <= counter) {
    aveA0 = sumA0 / counter;
    aveA1 = sumA1 / counter;
    aveD0 = valD0 / counter;

    Serial.println(String(valA0) + "," + String(valA1) + "," + String(valD0));

    counter = 0;
    aveA0 = 0;
    aveA1 = 0;
    aveD0 = 0;
  }

  delay(100);
}

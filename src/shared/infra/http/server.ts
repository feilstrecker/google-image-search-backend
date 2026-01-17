import { app } from './app';

app.listen(3000, '0.0.0.0', async () => {
  console.log('Connected to database.');
  console.log(`Server is running on port ${3000}`);

  const parentType = process.env.PARENT_TYPE;
  const childUrls = process.env.CHILD_URLS ?? [];

  console.log({ childUrls, parentType });
});

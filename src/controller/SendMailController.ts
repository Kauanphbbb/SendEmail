import { Request, Response } from "express";
import { getCustomRepository } from "typeorm";
import { SurveyRepository } from "../repositories/SurveyRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import sendMailServices from "../services/sendMailServices";
import { resolve } from "path";
import { AppError } from "../errors/AppError";

class SendMailController {
  async execute(request: Request, response: Response) {
    const { email, survey_id } = request.body;

    const usersRepository = getCustomRepository(UsersRepository);
    const surveyRepository = getCustomRepository(SurveyRepository);
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

    const user = await usersRepository.findOne({ email });
    const surveys = await surveyRepository.findOne({ id: survey_id });
    const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
      where: { user_id: user.id, value: null },
      relations: ["user", "survey"],
    });

    if (!user) {
      throw new AppError("User does not exist");
    }

    if (!surveys) {
      throw new AppError("Survey does not exist");
    }

    const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");

    const variables = {
      name: user.name,
      title: surveys.title,
      description: surveys.description,
      id: "",
      link: process.env.URL_MAIL,
    };

    if (surveyUserAlreadyExists) {
      variables.id = surveyUserAlreadyExists.id;
      await sendMailServices.execute(email, surveys.title, variables, npsPath);
      return response.json(surveyUserAlreadyExists);
    }

    //Salvar as informações na tabela surveysUsers
    const surveyUser = surveysUsersRepository.create({
      user_id: user.id,
      survey_id,
    });
    await surveysUsersRepository.save(surveyUser);

    //Enviar o e-mail para o usuário

    variables.id = surveyUser.id;

    await sendMailServices.execute(email, surveys.title, variables, npsPath);

    return response.json(surveyUser);
  }
}

export { SendMailController };
